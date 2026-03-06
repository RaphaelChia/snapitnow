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
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        onClick={handleCapture}
        disabled={disabled}
        className={cn(
          "flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white/80 transition-all",
          disabled ? "opacity-40" : "active:scale-90",
        )}
        aria-label="Capture photo"
      >
        <div
          className={cn(
            "h-[58px] w-[58px] rounded-full transition-colors",
            isBusy ? "bg-red-500 animate-pulse" : "bg-white",
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
