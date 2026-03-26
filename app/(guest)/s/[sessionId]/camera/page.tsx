"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CameraViewfinder,
  type CameraViewfinderHandle,
} from "./camera-viewfinder";

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
  const [captureOrientation, setCaptureOrientation] = useState<"portrait" | "landscape">("portrait");
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
      <header className="flex justify-around items-center px-6 py-4 w-full bg-analog-surface z-40">
        <h1 className="font-newsreader font-bold text-analog-tertiary tracking-tighter italic text-2xl uppercase">M M R S</h1>
      </header>

      <main className="flex flex-col h-[calc(100dvh-64px)] w-full max-w-lg mx-auto p-4 pb-0 gap-4">
        {/* Viewfinder Section */}
        <section className="flex grow w-full  items-center justify-center overflow-hidden">
          <div className={`relative max-w-full max-h-full ${captureOrientation === "portrait" ? "aspect-3/4" : "aspect-4/3"}`}>
            <CameraViewfinder
              ref={cameraRef}
              activeFilterId={activeFilterId}
              facingMode={facingMode}
              captureOrientation={captureOrientation}
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
          </div>
        </section>

        {/* Camera Hardware Interface */}
        <section className="relative flex flex-col gap-4 bg-analog-surface-container-low p-6 rounded-t-xl border-t border-analog-outline/15">
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
                  onClick={handleConfirmUpload}
                  disabled={isCapturingOrUploading}
                  className="flex-2 rounded-none bg-analog-primary text-analog-on-primary font-bold hover:bg-analog-primary/90 disabled:opacity-50"
                >
                  {isCapturingOrUploading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              {/* Left Controls */}
              <div className="flex flex-col gap-4 w-14">
                {/* Flip Camera */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-analog-outline font-bold">Flip</span>
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    disabled={isCapturingOrUploading}
                    className="w-9 h-9 bg-analog-surface-container-lowest rounded-full flex items-center justify-center analog-machined-depth text-analog-outline active:scale-95 transition-transform"
                  >
                    <RefreshCwIcon className="size-4" />
                  </button>
                </div>

                {/* Aspect Toggle */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-analog-outline font-bold">Frame</span>
                  <div className="flex flex-col overflow-hidden rounded-md border border-analog-outline/30">
                    <button
                      type="button"
                      onClick={() => setCaptureOrientation("portrait")}
                      disabled={isCapturingOrUploading || Boolean(pendingBlob)}
                      className={`px-2 py-1 text-[9px] uppercase tracking-wide ${captureOrientation === "portrait" ? "bg-analog-primary text-analog-on-primary" : "bg-analog-surface-container-lowest text-analog-outline"} disabled:opacity-50`}
                    >
                      3:4
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptureOrientation("landscape")}
                      disabled={isCapturingOrUploading || Boolean(pendingBlob)}
                      className={`px-2 py-1 text-[9px] uppercase tracking-wide ${captureOrientation === "landscape" ? "bg-analog-primary text-analog-on-primary" : "bg-analog-surface-container-lowest text-analog-outline"} disabled:opacity-50`}
                    >
                      4:3
                    </button>
                  </div>
                </div>
              </div>

              {/* Shutter Assembly (Center) */}
              <div className="flex-1 flex justify-center">
                <CaptureButton
                  isBusy={isCapturingOrUploading}
                  shotsRemaining={remainingShots}
                  onCapture={handleCapture}
                  showRemainingLabel={false}
                />
              </div>

              {/* Right Controls */}
              <div className="flex flex-col gap-4">
                {/* Gallery */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-analog-outline font-bold">Gallery</span>
                  <Link
                    href={`/s/${sessionId}/gallery`}
                    className="w-9 h-9 bg-analog-surface-container-lowest rounded-full flex items-center justify-center analog-machined-depth text-analog-outline active:scale-95 hover:text-analog-primary hover:border-analog-primary/30 border border-transparent transition-all"
                  >
                    <Youtube className="size-4" />
                  </Link>
                </div>

                {/* Exposure Counter (Compact) */}
                <div className="w-14 flex flex-col items-center gap-1.5">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-analog-outline font-bold">Exp</span>
                  <div className=" w-fit px-1.5 h-fit py-1 rounded-sm flex items-center justify-center border border-analog-outline/10">
                    <span className="font-mono font-bold italic text-sm text-analog-tertiary leading-none">{shotsTaken}/{session.roll_preset}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>


      </main>

      {/* Viewfinder Nav Marker */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-analog-primary rounded-full shadow-[0_0_8px_rgba(255,213,151,0.8)] z-50"></div>
    </div>
  );
}
