"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { FILTER_CSS } from "@/lib/filters/css"
import type { FilterId } from "@/lib/filters/presets"

type ImageCaptureLike = {
  takePhoto: () => Promise<Blob>
}

type WindowWithImageCapture = Window & {
  ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike
}

const CAPTURE_QUALITY = 0.92
const PORTRAIT_ASPECT_RATIO = 3 / 4
const LANDSCAPE_ASPECT_RATIO = 4 / 3

type CropRect = {
  sx: number
  sy: number
  sw: number
  sh: number
}

function getCenteredCropRect(width: number, height: number, targetAspect: number): CropRect {
  const sourceAspect = width / height

  if (Math.abs(sourceAspect - targetAspect) < 0.0001) {
    return { sx: 0, sy: 0, sw: width, sh: height }
  }

  if (sourceAspect > targetAspect) {
    const sw = height * targetAspect
    return {
      sx: (width - sw) / 2,
      sy: 0,
      sw,
      sh: height,
    }
  }

  const sh = width / targetAspect
  return {
    sx: 0,
    sy: (height - sh) / 2,
    sw: width,
    sh,
  }
}

export interface CameraViewfinderHandle {
  captureFrame: () => Promise<Blob | null>
}

interface CameraViewfinderProps {
  activeFilterId: FilterId
  facingMode: "user" | "environment"
  captureOrientation: "portrait" | "landscape"
  frozenPreviewUrl?: string | null
  isFrozen?: boolean
  onStreamReady?: () => void
  onStreamError?: (error: Error) => void
}

export const CameraViewfinder = forwardRef<
  CameraViewfinderHandle,
  CameraViewfinderProps
>(function CameraViewfinder(
  {
    activeFilterId,
    facingMode,
    captureOrientation,
    frozenPreviewUrl,
    isFrozen = false,
    onStreamReady,
    onStreamError,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [activeFacingMode, setActiveFacingMode] = useState<"user" | "environment">(
    facingMode,
  )
  const targetAspectRatio =
    captureOrientation === "portrait" ? PORTRAIT_ASPECT_RATIO : LANDSCAPE_ASPECT_RATIO
  const preferredWidth = captureOrientation === "portrait" ? 1200 : 1600
  const preferredHeight = captureOrientation === "portrait" ? 1600 : 1200

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      let lastError: unknown = null
      try {
        const streamAttempts: MediaStreamConstraints[] = [
          {
            video: {
              facingMode: { exact: facingMode },
              aspectRatio: { ideal: targetAspectRatio },
              width: { ideal: preferredWidth },
              height: { ideal: preferredHeight },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: facingMode },
              aspectRatio: { ideal: targetAspectRatio },
              width: { ideal: preferredWidth },
              height: { ideal: preferredHeight },
            },
            audio: false,
          },
          {
            video: {
              aspectRatio: { ideal: targetAspectRatio },
              width: { ideal: preferredWidth },
              height: { ideal: preferredHeight },
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
  }, [
    facingMode,
    onStreamReady,
    onStreamError,
    targetAspectRatio,
    preferredWidth,
    preferredHeight,
  ])

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> => {
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", CAPTURE_QUALITY)
    })
  }

  const cropVideoFrameToTargetAspect = (video: HTMLVideoElement): Promise<Blob | null> => {
    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    if (!sourceWidth || !sourceHeight) return Promise.resolve(null)

    const crop = getCenteredCropRect(sourceWidth, sourceHeight, targetAspectRatio)
    const outputHeight = Math.round(crop.sh)
    const outputWidth = Math.round(outputHeight * targetAspectRatio)

    const canvas = document.createElement("canvas")
    canvas.width = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return Promise.resolve(null)

    // Keep the captured file normalized; mirror only in preview UI.
    ctx.drawImage(
      video,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      outputWidth,
      outputHeight,
    )

    return canvasToBlob(canvas)
  }

  const cropBlobToTargetAspect = async (sourceBlob: Blob): Promise<Blob | null> => {
    try {
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(sourceBlob)
        try {
          const crop = getCenteredCropRect(bitmap.width, bitmap.height, targetAspectRatio)
          const outputWidth = Math.round(crop.sw)
          const outputHeight = Math.round(crop.sh)

          const canvas = document.createElement("canvas")
          canvas.width = outputWidth
          canvas.height = outputHeight
          const ctx = canvas.getContext("2d")
          if (!ctx) return null

          ctx.drawImage(
            bitmap,
            crop.sx,
            crop.sy,
            crop.sw,
            crop.sh,
            0,
            0,
            outputWidth,
            outputHeight,
          )

          return await canvasToBlob(canvas)
        } finally {
          bitmap.close()
        }
      }
    } catch {
      // Fall through to canvas fallback if bitmap decode fails.
    }

    return null
  }

  const captureFromCanvas = (): Promise<Blob | null> => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return Promise.resolve(null)
    return cropVideoFrameToTargetAspect(video)
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
            const croppedBlob = await cropBlobToTargetAspect(blob)
            if (croppedBlob && croppedBlob.size > 0) {
              return croppedBlob
            }
          }
        } catch {
          // If still capture is unsupported or fails on this browser, use canvas fallback.
        }
      }

      return captureFromCanvas()
    },
  }), [captureFromCanvas, cropBlobToTargetAspect])

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
        className={`h-full w-full object-cover ${isFrozen ? "opacity-0" : "opacity-100"} transition-opacity duration-75`}
        onPause={(e) => { e.currentTarget.play().catch(() => { }) }}
        onClick={(e) => { e.preventDefault() }}
      />
      {/* Warm Grain Overlay for Viewfinder */}
      <div className="absolute inset-0 bg-analog-primary-container/10 mix-blend-overlay pointer-events-none"></div>
      
      {/* Focus Square */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-analog-secondary opacity-40 pointer-events-none"></div>

      {isFrozen && frozenPreviewUrl && (
        <img
          src={frozenPreviewUrl}
          alt="Captured preview"
          className="absolute inset-0 z-20 h-full w-full object-cover"
          style={{ filter: cssFilter, transform: shouldMirror ? "scaleX(-1)" : undefined }}
        />
      )}
    </div>
  )
})
