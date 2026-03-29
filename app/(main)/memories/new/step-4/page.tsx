"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSession } from "@/hooks/use-sessions";
import { coerceLocalDateString, formatLocalDateForDisplay } from "@/lib/dates/local-date";
import { FILTER_PRESETS } from "@/lib/filters/presets";
import { initialMemoryWizardState, memoryWizardAtom } from "@/lib/state/memory-wizard-atom";
import { useAtom } from "jotai";
import { Calendar, Camera, ChevronLeft, Lock, Palette, Rocket, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Step4Page() {
  const [state, setState] = useAtom(memoryWizardAtom);
  const router = useRouter();
  const createMutation = useCreateSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedFilter = FILTER_PRESETS.find(f => f.id === state.fixedFilter);
  const normalizedWeddingDate = coerceLocalDateString(state.weddingDateLocal);

  const handleSubmit = async () => {
    if (!normalizedWeddingDate) return;

    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        title: state.title.trim(),
        roll_preset: state.rollPreset,
        filter_mode: "fixed",
        fixed_filter: state.fixedFilter,
        allowed_filters: null,
        password: state.password || null,
        wedding_date_local: normalizedWeddingDate,
        event_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });

      // Clear wizard state on success
      setState(initialMemoryWizardState);
      router.push("/");
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/memories/new/step-3");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        {/* Password Section */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
            <Lock className="size-4 text-muted-foreground" />
            Guest Password (Optional)
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="e.g. smith2026"
            value={state.password}
            onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value }))}
            className="h-12 rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Guests will need this to join and take photos. Leave empty for no password.
          </p>
        </div>

        {/* Review Summary */}
        <div className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-primary" />
            Review Summary
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background border">
                <Calendar className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</span>
                <span className="text-sm font-medium">
                  {normalizedWeddingDate
                    ? formatLocalDateForDisplay(normalizedWeddingDate)
                    : "Not set"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background border">
                <Camera className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Photos</span>
                <span className="text-sm font-medium">{state.rollPreset} per guest</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background border">
                <Palette className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Film Stock</span>
                <span className="text-sm font-medium">{selectedFilter?.name}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background border">
                <Lock className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Access</span>
                <span className="text-sm font-medium">{state.password ? "Password Protected" : "Public Access"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || createMutation.isPending || !normalizedWeddingDate}
          className="h-14 w-full gap-2 rounded-2xl text-lg font-medium shadow-lg transition-all active:scale-95"
        >
          {isSubmitting ? "Creating..." : "Create Memory"}
          <Rocket className="size-5" />
        </Button>
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isSubmitting}
          className="h-12 w-full gap-2 rounded-xl text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Look & Feel
        </Button>
      </div>
    </div>
  );
}
