"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CaptureButtonProps {
  isBusy: boolean
  shotsRemaining: number
  onCapture: () => Promise<void>
  showRemainingLabel?: boolean
}

export function CaptureButton({
  isBusy,
  shotsRemaining,
  onCapture,
  showRemainingLabel = true,
}: CaptureButtonProps) {
  const disabled = isBusy || shotsRemaining <= 0

  async function handleCapture() {
    if (disabled) return

    await onCapture()
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        onClick={handleCapture}
        disabled={disabled}
        className={cn(
          "flex h-[82px] w-[82px] items-center justify-center rounded-full border-[3px] border-white/85 bg-black/20 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200",
          disabled
            ? "opacity-55"
            : "active:scale-95 hover:border-primary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60",
        )}
        aria-label="Capture photo"
      >
        <div
          className={cn(
            "h-[62px] w-[62px] rounded-full transition-all duration-200",
            isBusy
              ? "animate-pulse bg-primary/95 scale-[0.98]"
              : "bg-white shadow-inner",
          )}
        />
      </Button>
      {showRemainingLabel && (
        <span className="text-sm font-medium text-white/80">
          {isBusy
            ? "Saving..."
            : shotsRemaining <= 0
              ? "All captured"
              : `${shotsRemaining} moment${shotsRemaining === 1 ? "" : "s"} left`}
        </span>
      )}
    </div>
  )
}
