"use client"

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import Image from "next/image"
import { FILTER_CSS } from "@/lib/filters/css"
import type { FilterId } from "@/lib/filters/presets"

export interface CameraViewfinderHandle {
  captureFrame: () => Promise<Blob | null>
}

interface CameraViewfinderProps {
  activeFilterId: FilterId
  frozenPreviewUrl?: string | null
  isFrozen?: boolean
  onStreamReady?: () => void
  onStreamError?: (error: Error) => void
}

export const CameraViewfinder = forwardRef<
  CameraViewfinderHandle,
  CameraViewfinderProps
>(function CameraViewfinder(
  { activeFilterId, frozenPreviewUrl, isFrozen = false, onStreamReady, onStreamError },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

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
  }, [onStreamReady, onStreamError])

  useImperativeHandle(ref, () => ({
    async captureFrame(): Promise<Blob | null> {
      const video = videoRef.current
      if (!video || video.readyState < 2) return null

      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) return null

      ctx.drawImage(video, 0, 0)

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92)
      })
    },
  }))

  const cssFilter = FILTER_CSS[activeFilterId]

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ filter: cssFilter }}
        className="h-full w-full object-cover"
        onPause={(e) => { e.currentTarget.play().catch(() => {}) }}
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
          style={{ filter: cssFilter }}
        />
      )}
    </div>
  )
})
