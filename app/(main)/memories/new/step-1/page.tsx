"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  coerceLocalDateString,
  formatLocalDateForDisplay,
  parseLocalDateToDate,
  toLocalDateString,
} from "@/lib/dates/local-date";
import { memoryWizardAtom } from "@/lib/state/memory-wizard-atom";
import { useAtom } from "jotai";
import { ArrowRight, ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MIN_WEDDING_DATE = new Date(Date.now() + 1000 * 60 * 60 * 24);

export default function Step1Page() {
  const [state, setState] = useAtom(memoryWizardAtom);
  const router = useRouter();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const normalizedWeddingDate = coerceLocalDateString(state.weddingDateLocal);
  const selectedDate = normalizedWeddingDate
    ? parseLocalDateToDate(normalizedWeddingDate)
    : undefined;

  useEffect(() => {
    if (
      normalizedWeddingDate &&
      normalizedWeddingDate !== state.weddingDateLocal
    ) {
      setState((prev) => ({ ...prev, weddingDateLocal: normalizedWeddingDate }));
    }
  }, [normalizedWeddingDate, setState, state.weddingDateLocal]);

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
          <Label htmlFor="date" className="text-sm font-medium">Wedding Date (estimated)</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                data-empty={!state.weddingDateLocal}
                className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
              >
                {state.weddingDateLocal ? formatLocalDateForDisplay(state.weddingDateLocal) : <span>Pick a date</span>}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                disabled={{ before: MIN_WEDDING_DATE }}
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setState((prev) => ({
                    ...prev,
                    weddingDateLocal: date ? toLocalDateString(date) : "",
                  }));
                  if (date) {
                    setIsDatePickerOpen(false);
                  }
                }}
                defaultMonth={selectedDate}
              />
            </PopoverContent>
          </Popover>
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
