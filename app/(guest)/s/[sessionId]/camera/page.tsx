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
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, Youtube } from "lucide-react";

function getExpiredSessionTitle(error: GuestApiError): string | null {
  if (!error.details || typeof error.details !== "object") {
    return null;
  }
  const title = Reflect.get(error.details, "title");
  return typeof title === "string" ? title : null;
}

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
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const cameraInitQuery = useGuestCameraInit(sessionId);
  const session = cameraInitQuery.data?.session ?? null;
  const guestSession = cameraInitQuery.data?.guestSession ?? null;
  const isUnauthenticated =
    cameraInitQuery.error instanceof GuestApiError &&
    cameraInitQuery.error.status === 401;
  const isSessionExpired =
    cameraInitQuery.error instanceof GuestApiError &&
    cameraInitQuery.error.status === 410;
  const queryErrorMessage =
    cameraInitQuery.isError && !isUnauthenticated && !isSessionExpired
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
  const handleFlipCamera = useCallback(() => {
    if (isCapturingOrUploading || pendingBlob) return;
    setRuntimeError(null);
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, [isCapturingOrUploading, pendingBlob]);

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
  }, [
    pendingBlob,
    isCapturingOrUploading,
    sessionId,
    activeFilterId,
    caption,
    frozenPreviewUrl,
  ]);

  useEffect(() => {
    return () => {
      if (frozenPreviewUrl) {
        URL.revokeObjectURL(frozenPreviewUrl);
      }
    };
  }, [frozenPreviewUrl]);

  if (cameraInitQuery.isPending || isUnauthenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-analog-surface font-space-grotesk">
        <div className="analog-grain-overlay"></div>
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-analog-outline/30 border-t-analog-primary" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-analog-outline font-bold">Initializing Lens</p>
        </div>
      </div>
    );
  }

  if (isSessionExpired && cameraInitQuery.error instanceof GuestApiError) {
    const title = getExpiredSessionTitle(cameraInitQuery.error);
    return (
      <div className="flex h-dvh items-center justify-center bg-analog-surface font-space-grotesk px-6 text-center">
        <div className="analog-grain-overlay"></div>
        <div className="space-y-6 z-10">
          <h1 className="font-newsreader font-bold text-analog-tertiary tracking-tighter italic text-3xl uppercase">SESSION CLOSED</h1>
          <div className="space-y-2">
            <p className="text-sm text-analog-tertiary/90 tracking-wide uppercase">
              Thank you for being part of {title ?? "this celebration"}.
            </p>
            <p className="text-xs text-analog-outline tracking-widest uppercase font-bold">Uploads are now closed.</p>
          </div>
          <Button asChild variant="outline" className="rounded-none border-analog-outline/30 text-analog-tertiary hover:bg-analog-surface-container-high px-8">
            <Link href={`/s/${sessionId}/gallery`}>View gallery</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-analog-surface font-space-grotesk px-6 text-center">
        <div className="analog-grain-overlay"></div>
        <div className="space-y-2 z-10">
          <h1 className="font-newsreader font-bold text-analog-tertiary tracking-tighter italic text-3xl uppercase">SYSTEM ERROR</h1>
          <p className="text-sm text-red-400/90 tracking-wide uppercase font-bold">{error}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
          className="rounded-none border-analog-outline/30 text-analog-tertiary hover:bg-analog-surface-container-high px-8 z-10"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!session || !guestSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-analog-surface font-space-grotesk">
        <div className="analog-grain-overlay"></div>
        <p className="text-sm text-analog-outline tracking-widest uppercase font-bold z-10">Session not found</p>
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
  const controlButton3dClass =
    "p-1.5 aspect-square rounded-full border border-white/25 bg-gradient-to-b from-white/25 to-white/5 text-white/95 shadow-[0_3px_0_rgba(0,0,0,0.35),0_10px_18px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-150 hover:border-primary/45 hover:from-white/35 hover:to-white/10 hover:text-white active:translate-y-[1px] active:shadow-[0_1px_0_rgba(0,0,0,0.35),0_5px_12px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.3)] disabled:translate-y-0 disabled:shadow-[0_3px_0_rgba(0,0,0,0.25),0_8px_14px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] disabled:opacity-50";

  if (rollExhausted) {
    return (
      <div className="flex h-dvh items-center justify-center bg-analog-surface font-space-grotesk">
        <div className="analog-grain-overlay"></div>
        <div className="flex flex-col items-center justify-center gap-4 pb-6 z-10">
          <h1 className="font-newsreader font-bold text-analog-tertiary tracking-tighter italic text-3xl uppercase mb-4">ROLL EXHAUSTED</h1>
          <Button
            asChild
            variant="outline"
            className="rounded-none border-analog-outline/30 text-analog-tertiary hover:bg-analog-surface-container-high px-8 py-6 text-lg"
          >
            <Link href={`/s/${sessionId}/gallery`}>View gallery</Link>
          </Button>
          <p className="text-sm text-analog-outline tracking-widest uppercase font-bold">
            {session.roll_preset}/{session.roll_preset} MOMENTS CAPTURED
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-analog-surface font-space-grotesk">
      <div className="analog-grain-overlay"></div>

      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 w-full bg-analog-surface z-40">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" className="text-analog-primary-container"><path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z"/></svg>
        </div>
        <h1 className="font-newsreader font-bold text-analog-tertiary tracking-tighter italic text-2xl uppercase">THE ANALOG LENS</h1>
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" className="text-analog-primary-container"><path d="M320-80v-440l280 240v-120L320-680v280L120-600v-280h480v160l240 200v120L600-320v120l240 200v120H320Z"/></svg>
        </div>
      </header>

      <main className="flex flex-col h-[calc(100vh-140px)] w-full max-w-lg mx-auto p-4 gap-4">
        {/* Viewfinder Section */}
        <section className="relative flex-grow w-full overflow-hidden">
          <CameraViewfinder
            ref={cameraRef}
            activeFilterId={activeFilterId}
            facingMode={facingMode}
            isFrozen={Boolean(frozenPreviewUrl)}
            frozenPreviewUrl={frozenPreviewUrl}
            onStreamError={handleStreamError}
          />

          {/* Viewfinder UI Overlays */}
          <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
            <div className="bg-analog-surface-container-lowest/60 backdrop-blur-sm px-2 py-0.5 rounded-sm">
              <span className="text-[10px] uppercase tracking-widest text-analog-primary font-bold">LIVE</span>
            </div>
          </div>

          {/* Digital Date Stamp */}
          <div className="absolute bottom-6 right-6 font-space-grotesk text-analog-primary-container text-xl italic font-bold tracking-tighter pointer-events-none" style={{ filter: "drop-shadow(0 0 2px rgba(255, 176, 0, 0.5))" }}>
            &apos;26  03  21
          </div>
        </section>

        {/* Camera Hardware Interface */}
        <section className="flex flex-col gap-6 bg-analog-surface-container-low p-6 rounded-t-xl border-t border-analog-outline/15">
          {pendingBlob ? (
            <div className="flex flex-col items-center justify-center">
              <input
                type="text"
                maxLength={16}
                placeholder="Add a short caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="mb-3 w-full rounded-none border-b border-analog-outline/30 bg-transparent px-3 py-2 text-center text-sm text-analog-tertiary placeholder:text-analog-outline/40 focus:border-analog-primary focus:outline-none"
                autoFocus
              />
              <div className="flex gap-3 w-full">
                <Button
                  onClick={() => {
                    if (frozenPreviewUrl) URL.revokeObjectURL(frozenPreviewUrl);
                    setFrozenPreviewUrl(null);
                    setPendingBlob(null);
                  }}
                  variant="outline"
                  className="flex-1 rounded-none border-analog-outline/30 text-analog-tertiary hover:bg-analog-surface-container-high"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleConfirmUpload}
                  disabled={isCapturingOrUploading}
                  className="flex-2 rounded-none bg-analog-primary text-analog-on-primary font-bold hover:bg-analog-primary/90 disabled:opacity-50"
                >
                  {isCapturingOrUploading ? "Saving..." : "Keep Photo"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Primary Controls Row */}
              <div className="flex items-center justify-between">
                {/* Filter Selector */}
                <div className="flex flex-col gap-2 flex-grow">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-analog-outline font-bold">Filter Mode</span>
                  {showFilterStrip && (
                    <FilterStrip
                      allowedFilters={session.allowed_filters as FilterId[]}
                      activeFilterId={activeFilterId}
                      onSelect={setSelectedFilterId}
                    />
                  )}
                </div>

                {/* Flip Camera */}
                <div className="flex flex-col items-center gap-2 ml-4">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-analog-outline font-bold">Flip</span>
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    disabled={isCapturingOrUploading}
                    className="w-10 h-10 bg-analog-surface-container-lowest rounded-full flex items-center justify-center analog-machined-depth text-analog-outline active:scale-95 transition-transform"
                  >
                    <RefreshCwIcon className="size-5" />
                  </button>
                </div>
              </div>

              {/* Shutter Assembly */}
              <CaptureButton
                isBusy={isCapturingOrUploading}
                shotsRemaining={remainingShots}
                onCapture={handleCapture}
                showRemainingLabel={false}
              />

              {/* Exposure Counter */}
              <div className="flex justify-center">
                <div className="bg-analog-surface-container-lowest px-4 py-1 rounded-sm flex items-baseline gap-2 border border-analog-outline/10">
                  <span className="text-[8px] uppercase tracking-widest text-analog-outline font-bold">Exposures</span>
                  <span className="font-newsreader italic text-2xl text-analog-tertiary leading-none">{shotsTaken}</span>
                  <span className="text-xs text-analog-outline">/ {session.roll_preset}</span>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Viewfinder Nav Marker */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-analog-primary rounded-full shadow-[0_0_8px_rgba(255,213,151,0.8)] z-50"></div>
    </div>
  );
}
