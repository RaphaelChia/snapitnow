"use client";

import { useAtom } from "jotai";
import { memoryWizardAtom } from "@/lib/state/memory-wizard-atom";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, Check } from "lucide-react";
import { FILTER_PRESETS, MVP_FILTER_IDS, type FilterId } from "@/lib/filters/presets";
import { FILTER_CSS } from "@/lib/filters/css";
import { cn } from "@/lib/utils";

const MVP_PRESETS = FILTER_PRESETS.filter((p) => MVP_FILTER_IDS.includes(p.id));

export default function Step3Page() {
  const [state, setState] = useAtom(memoryWizardAtom);
  const router = useRouter();

  const handleNext = () => {
    router.push("/memories/new/step-4");
  };

  const handleBack = () => {
    router.push("/memories/new/step-2");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MVP_PRESETS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, fixedFilter: filter.id }))}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all active:scale-[0.98]",
                state.fixedFilter === filter.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md"
                  : "border-muted bg-muted/30 hover:border-muted-foreground/30"
              )}
            >
              {/* Preview Image / Placeholder with Filter */}
              <div className="relative aspect-video w-full bg-muted/50 overflow-hidden">
                <div 
                  className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=400&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ filter: FILTER_CSS[filter.id] }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-60" />
                
                {state.fixedFilter === filter.id && (
                  <div className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Check className="size-4" />
                  </div>
                )}
              </div>

              <div className="flex flex-col p-4 text-left">
                <span className="font-semibold">{filter.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{filter.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Button
          onClick={handleNext}
          className="h-14 w-full gap-2 rounded-2xl text-lg font-medium shadow-lg transition-all active:scale-95"
        >
          Next: Security
          <ArrowRight className="size-5" />
        </Button>
        <Button
          variant="ghost"
          onClick={handleBack}
          className="h-12 w-full gap-2 rounded-xl text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Experience
        </Button>
      </div>
    </div>
  );
}
