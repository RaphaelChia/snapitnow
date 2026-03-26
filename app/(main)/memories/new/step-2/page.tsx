"use client";

import { Button } from "@/components/ui/button";
import { ROLL_PRESET_VALUES } from "@/lib/domain/roll-presets";
import { memoryWizardAtom } from "@/lib/state/memory-wizard-atom";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import { ArrowRight, Camera, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Step2Page() {
  const [state, setState] = useAtom(memoryWizardAtom);
  const router = useRouter();

  const handleNext = () => {
    router.push("/memories/new/step-3");
  };

  const handleBack = () => {
    router.push("/memories/new/step-1");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {ROLL_PRESET_VALUES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, rollPreset: preset }))}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 transition-all active:scale-95",
                  state.rollPreset === preset
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-muted bg-muted/30 hover:border-muted-foreground/30"
                )}
              >
                <div className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  state.rollPreset === preset ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Camera className="size-5" />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold tracking-tight">{preset}</div>
                  <div className="text-xs font-medium text-muted-foreground">Photos</div>
                </div>
                {state.rollPreset === preset && (
                  <div className="absolute top-3 right-3 size-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            This is the maximum number of photos each guest can take.
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Button
          onClick={handleNext}
          className="h-14 w-full gap-2 text-lg font-medium shadow-lg transition-all active:scale-95"
        >
          Next: Look & Feel
          <ArrowRight className="size-5" />
        </Button>
        <Button
          variant="ghost"
          onClick={handleBack}
          className="h-12 w-full gap-2 rounded-xl text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Basics
        </Button>
      </div>
    </div>
  );
}
