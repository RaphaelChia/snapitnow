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
import { GuestApiError, useGuestCameraInit } from "@/hooks/use-guest-auth";

export default function GuestCameraPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const cameraRef = useRef<CameraViewfinderHandle>(null);

  const [selectedFilterId, setSelectedFilterId] = useState<FilterId | null>(
    null
  );
  const [capturedCount, setCapturedCount] = useState(0);
  const [isCapturingOrUploading, setIsCapturingOrUploading] = useState(false);
  const [frozenPreviewUrl, setFrozenPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const cameraInitQuery = useGuestCameraInit(sessionId);
  const session = cameraInitQuery.data?.session ?? null;
  const guestSession = cameraInitQuery.data?.guestSession ?? null;
  const isUnauthenticated =
    cameraInitQuery.error instanceof GuestApiError &&
    cameraInitQuery.error.status === 401;
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
    if (isCapturingOrUploading || pendingBlob) return;

    setRuntimeError(null);

    const capturedBlob = (await cameraRef.current?.captureFrame()) ?? null;
    if (!capturedBlob) {
      setRuntimeError("Failed to capture frame");
      return;
    }

    const previewUrl = URL.createObjectURL(capturedBlob);
    setFrozenPreviewUrl(previewUrl);
    setPendingBlob(capturedBlob);
    setCaption("");
  }, [isCapturingOrUploading, pendingBlob]);

  const handleConfirmUpload = useCallback(async () => {
    if (!pendingBlob || isCapturingOrUploading) return;
    setIsCapturingOrUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", pendingBlob, "capture.jpg");
      formData.append("sessionId", sessionId);
      formData.append("filterUsed", activeFilterId);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Upload failed";
        throw new Error(message);
      }

      setCapturedCount((prev) => prev + 1);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (frozenPreviewUrl) URL.revokeObjectURL(frozenPreviewUrl);
      setFrozenPreviewUrl(null);
      setPendingBlob(null);
      setCaption("");
      setIsCapturingOrUploading(false);
    }
  }, [pendingBlob, isCapturingOrUploading, sessionId, activeFilterId, caption, frozenPreviewUrl]);

  const handleDiscardCapture = useCallback(() => {
    if (frozenPreviewUrl) URL.revokeObjectURL(frozenPreviewUrl);
    setFrozenPreviewUrl(null);
    setPendingBlob(null);
    setCaption("");
  }, [frozenPreviewUrl]);

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
  const remainingShots = Math.max(
    0,
    guestSession.shots_remaining - capturedCount
  );
  const rollExhausted = remainingShots <= 0;
  const shotsTaken = Math.max(0, session.roll_preset - remainingShots);
  const unlockThreshold = Math.ceil(session.roll_preset / 2);
  const galleryUnlocked = shotsTaken >= unlockThreshold;

  if (rollExhausted) {
    return (
      <div className="flex h-[calc(100dvh-56px)] items-center justify-center bg-black">
        <div className="flex flex-col items-center justify-center gap-2 pb-6">
          <Link
            href={`/s/${sessionId}/gallery`}
            className="rounded-xl border border-white/25 hover:border-primary/40 px-4 py-2 text-sm font-medium text-white/95 transition-all duration-200 hover:bg-white/10"
          >
            View gallery
          </Link>
          <p className="text-xs text-white/70">
            You&apos;ve used up all {session.roll_preset}/{session.roll_preset}{" "}
            of your roll.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-56px)] overflow-hidden bg-black">
      <CameraViewfinder
        ref={cameraRef}
        activeFilterId={activeFilterId}
        isFrozen={Boolean(frozenPreviewUrl)}
        frozenPreviewUrl={frozenPreviewUrl}
        onStreamError={handleStreamError}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
            {remainingShots <= 0
              ? "All captured"
              : `${remainingShots} moment${remainingShots === 1 ? "" : "s"} left`}
          </div>
          {!galleryUnlocked && (
            <div className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
              {Math.max(0, unlockThreshold - shotsTaken)} more to unlock gallery
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(env(safe-area-inset-bottom),0.9rem)]">
        {pendingBlob ? (
          <div className="rounded-[1.75rem] border border-white/15 bg-black/65 px-4 py-4 backdrop-blur-md">
            <input
              type="text"
              maxLength={16}
              placeholder="Add a short caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mb-3 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center text-sm text-white placeholder:text-white/40 focus:border-primary/50 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleDiscardCapture}
                disabled={isCapturingOrUploading}
                className="rounded-full border border-white/25 px-5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                Retake
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={isCapturingOrUploading}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-romance transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isCapturingOrUploading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-white/15 bg-black/65 backdrop-blur-md">
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
              showRemainingLabel={false}
            />

            <div className="flex items-center justify-center pb-4">
              <Link
                href={`/s/${sessionId}/gallery`}
                className="rounded-full border border-white/30 bg-black/30 px-4 py-2 text-sm font-medium text-white/95 transition-all duration-200 hover:border-primary/45 hover:bg-white/10"
              >
                View gallery
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
