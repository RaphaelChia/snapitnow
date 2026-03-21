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
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative group">
        {/* Outer Ring */}
        <div className="absolute inset-0 -m-3 border-[3px] border-analog-surface-container-high rounded-full opacity-50"></div>
        {/* The Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleCapture}
          disabled={disabled}
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-analog-primary to-analog-primary-container analog-shutter-concave transition-all duration-75 p-0",
            disabled
              ? "opacity-55"
              : "active:scale-95",
          )}
          aria-label="Capture photo"
        >
          <div className="w-14 h-14 rounded-full border border-analog-on-primary/20 flex items-center justify-center">
            <div
              className={cn(
                "h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center",
                isBusy
                  ? "animate-pulse"
                  : "",
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="currentColor" className="text-analog-on-primary"><path d="M480-213q71 0 120.5-49.5T650-383q0-71-49.5-120.5T480-553q-71 0-120.5 49.5T310-383q0 71 49.5 120.5T480-213Zm0-67q-43 0-73-30t-30-73q0-43 30-73t73-30q43 0 73 30t30 73q0 43-30 73t-73 30ZM160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h126l74-80h240l74 80h126q33 0 56.5 23.5T913-640v440q0 33-23.5 56.5T833-120H160Z"/></svg>
            </div>
          </div>
        </Button>
      </div>
    </div>
  )
}
