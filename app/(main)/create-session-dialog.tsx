"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSession } from "@/hooks/use-sessions";
import {
  ROLL_PRESET_VALUES,
  type RollPreset,
} from "@/lib/domain/roll-presets";
import { FILTER_CSS } from "@/lib/filters/css";
import {
  FILTER_PRESETS,
  MVP_FILTER_IDS,
  type FilterId,
} from "@/lib/filters/presets";
import { Check } from "lucide-react";
import { useState } from "react";

const MVP_PRESETS = FILTER_PRESETS.filter((p) => MVP_FILTER_IDS.includes(p.id));

function getBrowserLocalDate(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function FilterPreviewCard({
  filterId,
  name,
  description,
  selected,
  onSelect,
}: {
  filterId: FilterId;
  name: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition-all duration-200 motion-safe-fade-up ${selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-romance"
          : "border-border bg-background hover:border-muted-foreground/30"
        }`}
    >
      <div className="relative h-16 w-full overflow-hidden rounded-md">
        {/* Sample scene: sky gradient + ground, filtered with CSS */}
        <div
          className="absolute inset-0 motion-safe-drift"
          style={{ filter: FILTER_CSS[filterId] }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-sky-400 via-orange-200 to-amber-800" />
          <div className="absolute bottom-0 h-[40%] w-full bg-linear-to-t from-green-800 to-green-600 opacity-70" />
          <div className="absolute left-[20%] top-[15%] h-5 w-5 rounded-full bg-yellow-200 opacity-90" />
        </div>
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
            <div className="pulse-romance flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Check className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>
      <div className="text-center">
        <p
          className={`text-xs font-medium leading-tight ${selected ? "text-primary" : "text-foreground"
            }`}
        >
          {name}
        </p>
        <p className="text-[10px] leading-tight text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}

export function CreateSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateSession();

  const [title, setTitle] = useState("");
  const [rollPreset, setRollPreset] = useState<RollPreset>(12);
  const [fixedFilter, setFixedFilter] = useState<FilterId>("disposable-starter");
  const [password, setPassword] = useState("");
  const [weddingDateLocal, setWeddingDateLocal] = useState(
    getBrowserLocalDate()
  );

  const canSubmit =
    title.trim() &&
    !createMutation.isPending &&
    weddingDateLocal &&
    !!fixedFilter;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    createMutation.mutate(
      {
        title: title.trim(),
        roll_preset: rollPreset,
        filter_mode: "fixed",
        fixed_filter: fixedFilter,
        allowed_filters: null,
        password: password || null,
        wedding_date_local: weddingDateLocal,
        event_timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      {
        onSuccess: () => {
          setTitle("");
          setRollPreset(12);
          setFixedFilter("disposable-starter");
          setPassword("");
          setWeddingDateLocal(getBrowserLocalDate());
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a wedding memory</DialogTitle>
          <DialogDescription>
            Set up your photo session. You can activate it when you&apos;re
            ready.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Memory title</Label>
            <Input
              id="title"
              placeholder="e.g. Sarah's Wedding"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Moments per guest</Label>
            <div className="grid grid-cols-4 gap-2">
              {ROLL_PRESET_VALUES.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={rollPreset === preset ? "default" : "outline"}
                  onClick={() => setRollPreset(preset)}
                  className="rounded-xl"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <div className="motion-safe-fade-up flex flex-col gap-2">
            <Label>Film stock</Label>
            <p className="text-xs text-muted-foreground">
              Guests cannot switch filters. Pick one look for the whole memory.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MVP_PRESETS.map((preset) => (
                <FilterPreviewCard
                  key={preset.id}
                  filterId={preset.id}
                  name={preset.name}
                  description={preset.description}
                  selected={fixedFilter === preset.id}
                  onSelect={() => setFixedFilter(preset.id)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">
              Access password{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="password"
              type="text"
              placeholder="Leave blank for open access"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={64}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="weddingDate">Wedding date</Label>
            <Input
              id="weddingDate"
              type="date"
              value={weddingDateLocal}
              onChange={(e) => setWeddingDateLocal(e.target.value)}
              min={getBrowserLocalDate()}
              required
            />
            <p className="text-xs text-muted-foreground">
              Uploads auto-close at the end of the next day in your event
              timezone.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createMutation.isPending ? "Creating..." : "Create memory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
