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
import type { Session, GuestSession } from "@/lib/db/types";

export default function CameraPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const cameraRef = useRef<CameraViewfinderHandle>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<FilterId>("none");
  const [shotsRemaining, setShotsRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    async function loadSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/camera-init`);
        if (res.status === 401) {
          router.replace(`/s/${sessionId}`);
          return;
        }
        if (!res.ok) throw new Error("Failed to load session");

        const data = await res.json();
        setSession(data.session);
        setGuestSession(data.guestSession);
        setShotsRemaining(data.guestSession.shots_remaining);

        if (data.session.filter_mode === "fixed" && data.session.fixed_filter) {
          setActiveFilterId(data.session.fixed_filter as FilterId);
        } else if (
          data.session.filter_mode === "preset" &&
          data.session.allowed_filters?.length
        ) {
          setActiveFilterId(data.session.allowed_filters[0] as FilterId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [router, sessionId]);

  const handleStreamError = useCallback(
    (err: Error) => setError(err.message),
    []
  );

  const handleCapture = useCallback(async () => {
    return cameraRef.current?.captureFrame() ?? null;
  }, []);

  const handleUploadComplete = useCallback(() => {
    setShotsRemaining((prev) => Math.max(0, prev - 1));
  }, []);

  if (loading) {
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

  const showFilterStrip =
    session.filter_mode === "preset" &&
    session.allowed_filters &&
    session.allowed_filters.length > 0;
  const shotsTaken = Math.max(0, session.roll_preset - shotsRemaining);
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
          onSelect={setActiveFilterId}
        />
      )}

      <CaptureButton
        sessionId={sessionId}
        activeFilterId={activeFilterId}
        shotsRemaining={shotsRemaining}
        onCapture={handleCapture}
        onUploadComplete={handleUploadComplete}
        onError={(msg) => setError(msg)}
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
