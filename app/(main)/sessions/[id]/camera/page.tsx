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

export default function CameraPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const cameraRef = useRef<CameraViewfinderHandle>(null);

  const [selectedFilterId, setSelectedFilterId] = useState<FilterId | null>(null);
  const [capturedCount, setCapturedCount] = useState(0);
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
    return cameraRef.current?.captureFrame() ?? null;
  }, []);

  const handleUploadComplete = useCallback(() => {
    setCapturedCount((prev) => prev + 1);
  }, []);

  if (cameraInitQuery.isPending || isUnauthenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-black px-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-white/70 underline underline-offset-2"
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

  const defaultFilterId: FilterId =
    session.filter_mode === "fixed" && session.fixed_filter
      ? (session.fixed_filter as FilterId)
      : session.filter_mode === "preset" && session.allowed_filters?.length
        ? (session.allowed_filters[0] as FilterId)
        : "none";
  const activeFilterId = selectedFilterId ?? defaultFilterId;

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
        sessionId={sessionId}
        activeFilterId={activeFilterId}
        shotsRemaining={remainingShots}
        onCapture={handleCapture}
        onUploadComplete={handleUploadComplete}
        onError={(msg) => setRuntimeError(msg)}
      />

      <div className="flex items-center justify-center gap-2 pb-6">
        <Link
          href={`/sessions/${sessionId}/gallery`}
          className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          View gallery
        </Link>
        <Badge
          variant={galleryUnlocked ? "default" : "secondary"}
          className="text-[10px]"
        >
          {galleryUnlocked
            ? "Full gallery unlocked"
            : `${Math.max(0, unlockThreshold - shotsTaken)} more to unlock`}
        </Badge>
      </div>
    </div>
  );
}
