"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { memoryWizardAtom } from "@/lib/state/memory-wizard-atom";
import { useAtom } from "jotai";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Step1Page() {
  const [state, setState] = useAtom(memoryWizardAtom);
  const router = useRouter();

  const handleNext = () => {
    if (state.title.trim() && state.weddingDateLocal) {
      router.push("/memories/new/step-2");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title" className="text-sm font-medium">Memory title</Label>
          <Input
            id="title"
            placeholder="e.g. Sarah's Wedding"
            value={state.title}
            onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
            required
            maxLength={100}
            autoFocus
            className="h-12 rounded-xl text-lg"
          />
          <p className="text-xs text-muted-foreground">
            This title will be shown to your guests on the camera and gallery.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="date" className="text-sm font-medium">Wedding Date</Label>
          <Input
            id="date"
            type="date"
            value={state.weddingDateLocal}
            onChange={(e) => setState((prev) => ({ ...prev, weddingDateLocal: e.target.value }))}
            required
            className="h-12 rounded-xl text-lg"
          />
          <p className="text-xs text-muted-foreground">
            We use this to set the correct timezone for your event.
          </p>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <Button
          onClick={handleNext}
          disabled={!state.title.trim() || !state.weddingDateLocal}
          className="h-14 w-full gap-2 text-lg font-medium shadow-lg transition-all active:scale-95"
        >
          Next: Experience
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
