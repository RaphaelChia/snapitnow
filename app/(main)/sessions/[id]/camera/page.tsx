"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { CameraViewfinder, type CameraViewfinderHandle } from "./camera-viewfinder"
import { FilterStrip } from "./filter-strip"
import { CaptureButton } from "./capture-button"
import type { FilterId } from "@/lib/filters/presets"
import type { Session, GuestSession } from "@/lib/db/types"

export default function CameraPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const cameraRef = useRef<CameraViewfinderHandle>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null)
  const [activeFilterId, setActiveFilterId] = useState<FilterId>("none")
  const [shotsRemaining, setShotsRemaining] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)

  // TODO: Replace with real guest auth — for now read guestUserId from search params
  const [guestUserId, setGuestUserId] = useState<string>("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setGuestUserId(params.get("guestUserId") ?? "")
  }, [])

  useEffect(() => {
    if (!sessionId || !guestUserId) return

    async function loadSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/camera-init?guestUserId=${guestUserId}`)
        if (!res.ok) throw new Error("Failed to load session")

        const data = await res.json()
        setSession(data.session)
        setGuestSession(data.guestSession)
        setShotsRemaining(data.guestSession.shots_remaining)

        if (data.session.filter_mode === "fixed" && data.session.fixed_filter) {
          setActiveFilterId(data.session.fixed_filter as FilterId)
        } else if (data.session.filter_mode === "preset" && data.session.allowed_filters?.length) {
          setActiveFilterId(data.session.allowed_filters[0] as FilterId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [sessionId, guestUserId])

  const handleStreamReady = useCallback(() => setCameraReady(true), [])
  const handleStreamError = useCallback((err: Error) => setError(err.message), [])

  const handleCapture = useCallback(async () => {
    return cameraRef.current?.captureFrame() ?? null
  }, [])

  const handleUploadComplete = useCallback(() => {
    setShotsRemaining((prev) => Math.max(0, prev - 1))
  }, [])

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    )
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
    )
  }

  if (!session || !guestSession) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <p className="text-sm text-white/50">Session not found</p>
      </div>
    )
  }

  const showFilterStrip =
    session.filter_mode === "preset" && session.allowed_filters && session.allowed_filters.length > 0

  return (
    <div className="flex h-dvh flex-col bg-black">
      <CameraViewfinder
        ref={cameraRef}
        activeFilterId={activeFilterId}
        onStreamReady={handleStreamReady}
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
        guestUserId={guestUserId}
        activeFilterId={activeFilterId}
        shotsRemaining={shotsRemaining}
        onCapture={handleCapture}
        onUploadComplete={handleUploadComplete}
        onError={(msg) => setError(msg)}
      />
    </div>
  )
}
