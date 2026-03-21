"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import Image from "next/image"
import { FILTER_CSS } from "@/lib/filters/css"
import type { FilterId } from "@/lib/filters/presets"

type ImageCaptureLike = {
  takePhoto: () => Promise<Blob>
}

type WindowWithImageCapture = Window & {
  ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike
}

export interface CameraViewfinderHandle {
  captureFrame: () => Promise<Blob | null>
}

interface CameraViewfinderProps {
  activeFilterId: FilterId
  facingMode: "user" | "environment"
  frozenPreviewUrl?: string | null
  isFrozen?: boolean
  onStreamReady?: () => void
  onStreamError?: (error: Error) => void
}

export const CameraViewfinder = forwardRef<
  CameraViewfinderHandle,
  CameraViewfinderProps
>(function CameraViewfinder(
  { activeFilterId, facingMode, frozenPreviewUrl, isFrozen = false, onStreamReady, onStreamError },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [activeFacingMode, setActiveFacingMode] = useState<"user" | "environment">(
    facingMode,
  )

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      let lastError: unknown = null
      try {
        const streamAttempts: MediaStreamConstraints[] = [
          {
            video: {
              facingMode: { exact: facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          {
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
        ]

        let stream: MediaStream | null = null
        for (const constraints of streamAttempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints)
            break
          } catch (err) {
            lastError = err
          }
        }

        if (!stream) {
          throw lastError ?? new Error("Camera access denied")
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const [videoTrack] = stream.getVideoTracks()
        const trackFacing = videoTrack?.getSettings().facingMode
        setActiveFacingMode(trackFacing === "user" ? "user" : facingMode)

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        onStreamReady?.()
      } catch (err) {
        if (!cancelled) {
          onStreamError?.(
            err instanceof Error ? err : new Error("Camera access denied"),
          )
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facingMode, onStreamReady, onStreamError])

  const captureFromCanvas = (): Promise<Blob | null> => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return Promise.resolve(null)

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return Promise.resolve(null)

    // Keep the captured file normalized; mirror only in preview UI.
    ctx.drawImage(video, 0, 0)

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92)
    })
  }

  useImperativeHandle(ref, () => ({
    async captureFrame(): Promise<Blob | null> {
      const track = streamRef.current?.getVideoTracks()?.[0]
      if (!track || track.readyState !== "live") {
        return captureFromCanvas()
      }

      const imageCaptureCtor = (window as WindowWithImageCapture).ImageCapture
      if (imageCaptureCtor) {
        try {
          const imageCapture = new imageCaptureCtor(track)
          const blob = await imageCapture.takePhoto()
          if (blob && blob.size > 0) {
            return blob
          }
        } catch {
          // If still capture is unsupported or fails on this device/browser,
          // continue with canvas fallback for compatibility.
        }
      }

      return captureFromCanvas()
    },
  }), [])

  const cssFilter = FILTER_CSS[activeFilterId]
  const shouldMirror = activeFacingMode === "user"

  return (
    <div className="relative h-full w-full overflow-hidden bg-analog-surface-container-lowest border-4 border-analog-surface-container-high analog-machined-depth rounded-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ filter: cssFilter, transform: shouldMirror ? "scaleX(-1)" : undefined }}
        className="h-full w-full object-cover"
        onPause={(e) => { e.currentTarget.play().catch(() => { }) }}
        onClick={(e) => { e.preventDefault() }}
      />
      {/* Warm Grain Overlay for Viewfinder */}
      <div className="absolute inset-0 bg-analog-primary-container/10 mix-blend-overlay pointer-events-none"></div>
      
      {/* Focus Square */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-analog-secondary opacity-40 pointer-events-none"></div>

      {isFrozen && frozenPreviewUrl && (
        <Image
          src={frozenPreviewUrl}
          alt="Captured preview"
          fill
          unoptimized
          sizes="100vw"
          className="absolute inset-0 object-cover"
          style={{ filter: cssFilter, transform: shouldMirror ? "scaleX(-1)" : undefined }}
        />
      )}
    </div>
  )
})
