"use client"

import { cn } from "@/lib/utils"

interface CaptureButtonProps {
  isBusy: boolean
  shotsRemaining: number
  onCapture: () => Promise<void>
}

export function CaptureButton({
  isBusy,
  shotsRemaining,
  onCapture,
}: CaptureButtonProps) {
  const disabled = isBusy || shotsRemaining <= 0

  async function handleCapture() {
    if (disabled) return

    await onCapture()
  }

  return (
    <div className="flex flex-col items-center gap-3 py-5">
      <button
        onClick={handleCapture}
        disabled={disabled}
        className={cn(
          "flex h-[80px] w-[80px] items-center justify-center rounded-full border-[3px] border-white/90 transition-all duration-200",
          disabled ? "opacity-40" : "active:scale-95 hover:border-primary/40",
        )}
        aria-label="Capture photo"
      >
        <div
          className={cn(
            "h-[64px] w-[64px] rounded-full transition-colors duration-200",
            isBusy ? "bg-primary animate-pulse" : "bg-white",
          )}
        />
      </button>
      <span className="text-sm font-medium text-white/80">
        {shotsRemaining <= 0
          ? "All captured"
          : `${shotsRemaining} moment${shotsRemaining === 1 ? "" : "s"} left`}
      </span>
    </div>
  )
}
