"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { FilterId } from "@/lib/filters/presets"

interface CaptureButtonProps {
  sessionId: string
  activeFilterId: FilterId
  shotsRemaining: number
  onCapture: () => Promise<Blob | null>
  onUploadComplete: () => void
  onError: (error: string) => void
}

export function CaptureButton({
  sessionId,
  activeFilterId,
  shotsRemaining,
  onCapture,
  onUploadComplete,
  onError,
}: CaptureButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
  const disabled = isUploading || shotsRemaining <= 0

  async function handleCapture() {
    if (disabled) return

    setIsUploading(true)

    try {
      const blob = await onCapture()
      if (!blob) {
        onError("Failed to capture frame")
        setIsUploading(false)
        return
      }

      const formData = new FormData()
      formData.append("file", blob, "capture.jpg")
      formData.append("sessionId", sessionId)
      formData.append("filterUsed", activeFilterId)

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Upload failed")
      }

      onUploadComplete()
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        onClick={handleCapture}
        disabled={disabled}
        className={cn(
          "flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white/80 transition-all",
          disabled
            ? "opacity-40"
            : "active:scale-90",
        )}
        aria-label="Capture photo"
      >
        <div
          className={cn(
            "h-[58px] w-[58px] rounded-full transition-colors",
            isUploading ? "bg-red-500 animate-pulse" : "bg-white",
          )}
        />
      </button>
      <span className="text-xs font-medium text-white/70">
        {shotsRemaining <= 0
          ? "Roll complete"
          : `${shotsRemaining} shot${shotsRemaining === 1 ? "" : "s"} left`}
      </span>
    </div>
  )
}
