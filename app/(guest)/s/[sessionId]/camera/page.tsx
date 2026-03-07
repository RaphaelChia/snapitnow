"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CameraViewfinder,
  type CameraViewfinderHandle,
} from "./camera-viewfinder";
import { FilterStrip } from "./filter-strip";
import { CaptureButton } from "./capture-button";
import type { FilterId } from "@/lib/filters/presets";
import { Badge } from "@/components/ui/badge";
import {
  GuestApiError,
  useGuestCameraInit,
} from "@/hooks/use-guest-auth";

export default function GuestCameraPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const cameraRef = useRef<CameraViewfinderHandle>(null);

  const [selectedFilterId, setSelectedFilterId] = useState<FilterId | null>(null);
  const [capturedCount, setCapturedCount] = useState(0);
  const [isCapturingOrUploading, setIsCapturingOrUploading] = useState(false);
  const [frozenPreviewUrl, setFrozenPreviewUrl] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const cameraInitQuery = useGuestCameraInit(sessionId);
  const session = cameraInitQuery.data?.session ?? null;
  const guestSession = cameraInitQuery.data?.guestSession ?? null;
  const isUnauthenticated =
    cameraInitQuery.error instanceof GuestApiError && cameraInitQuery.error.status === 401;
  const queryErrorMessage =
    cameraInitQuery.isError && !isUnauthenticated
      ? cameraInitQuery.error instanceof Error
        ? cameraInitQuery.error.message
        : "Failed to load"
      : null;
  const error = runtimeError ?? queryErrorMessage;
  const defaultFilterId: FilterId =
    session?.filter_mode === "fixed" && session.fixed_filter
      ? (session.fixed_filter as FilterId)
      : session?.filter_mode === "preset" && session.allowed_filters?.length
        ? (session.allowed_filters[0] as FilterId)
        : "none";
  const activeFilterId = selectedFilterId ?? defaultFilterId;

  useEffect(() => {
    if (isUnauthenticated) {
      router.replace(`/s/${sessionId}`);
    }
  }, [isUnauthenticated, router, sessionId]);

  const handleStreamError = useCallback(
    (err: Error) => setRuntimeError(err.message),
    []
  );

  const handleCapture = useCallback(async () => {
    if (isCapturingOrUploading) return;

    setRuntimeError(null);
    setIsCapturingOrUploading(true);

    const capturedBlob = (await cameraRef.current?.captureFrame()) ?? null;
    if (!capturedBlob) {
      setRuntimeError("Failed to capture frame");
      setIsCapturingOrUploading(false);
      return;
    }

    const previewUrl = URL.createObjectURL(capturedBlob);
    setFrozenPreviewUrl(previewUrl);

    try {
      const formData = new FormData();
      formData.append("file", capturedBlob, "capture.jpg");
      formData.append("sessionId", sessionId);
      formData.append("filterUsed", activeFilterId);

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : "Upload failed";
        throw new Error(message);
      }

      setCapturedCount((prev) => prev + 1);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(previewUrl);
      setFrozenPreviewUrl(null);
      setIsCapturingOrUploading(false);
    }
  }, [activeFilterId, isCapturingOrUploading, sessionId]);

  useEffect(() => {
    return () => {
      if (frozenPreviewUrl) {
        URL.revokeObjectURL(frozenPreviewUrl);
      }
    };
  }, [frozenPreviewUrl]);

  if (cameraInitQuery.isPending || isUnauthenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-sm text-red-300/90">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/25 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!session || !guestSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <p className="text-sm text-white/50">Session not found</p>
      </div>
    );
  }

  const showFilterStrip =
    session.filter_mode === "preset" &&
    session.allowed_filters &&
    session.allowed_filters.length > 0;
  const remainingShots = Math.max(0, guestSession.shots_remaining - capturedCount);
  const shotsTaken = Math.max(0, session.roll_preset - remainingShots);
  const unlockThreshold = Math.ceil(session.roll_preset / 2);
  const galleryUnlocked = shotsTaken >= unlockThreshold;

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col bg-black">
      <CameraViewfinder
        ref={cameraRef}
        activeFilterId={activeFilterId}
        isFrozen={Boolean(frozenPreviewUrl)}
        frozenPreviewUrl={frozenPreviewUrl}
        onStreamError={handleStreamError}
      />

      {showFilterStrip && (
        <FilterStrip
          allowedFilters={session.allowed_filters as FilterId[]}
          activeFilterId={activeFilterId}
          onSelect={setSelectedFilterId}
        />
      )}

      <CaptureButton
        isBusy={isCapturingOrUploading}
        shotsRemaining={remainingShots}
        onCapture={handleCapture}
      />

      <div className="flex items-center justify-center gap-3 pb-6">
        <Link
          href={`/s/${sessionId}/gallery`}
          className="rounded-xl border border-white/25 hover:border-primary/40 px-4 py-2 text-sm font-medium text-white/95 transition-all duration-200 hover:bg-white/10"
        >
          View gallery
        </Link>
        <Badge
          variant={galleryUnlocked ? "default" : "secondary"}
          className="text-xs border-white/20 bg-white/10 text-white/95 backdrop-blur-sm"
        >
          {galleryUnlocked
            ? "Full gallery unlocked"
            : `${Math.max(0, unlockThreshold - shotsTaken)} more moments to unlock full album`}
        </Badge>
      </div>
    </div>
  );
}
