"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import Image from "next/image"
import { FILTER_CSS } from "@/lib/filters/css"
import type { FilterId } from "@/lib/filters/presets"

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

  useImperativeHandle(ref, () => ({
    async captureFrame(): Promise<Blob | null> {
      const video = videoRef.current
      if (!video || video.readyState < 2) return null

      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) return null

      if (activeFacingMode === "user") {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0)

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92)
      })
    },
  }), [activeFacingMode])

  const cssFilter = FILTER_CSS[activeFilterId]
  const shouldMirror = activeFacingMode === "user"

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
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
