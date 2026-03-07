"use client"

import { useState } from "react"
import { useCreateSession } from "@/hooks/use-sessions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FilterMode } from "@/lib/db/types"
import { FILTER_PRESETS, MVP_FILTER_IDS, type FilterId } from "@/lib/filters/presets"
import { FILTER_CSS } from "@/lib/filters/css"
import { Check } from "lucide-react"

const ROLL_PRESETS = [8, 12, 24, 36] as const
const MVP_PRESETS = FILTER_PRESETS.filter((p) => MVP_FILTER_IDS.includes(p.id))

function FilterPreviewCard({
  filterId,
  name,
  description,
  selected,
  onSelect,
}: {
  filterId: FilterId
  name: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition-all duration-200 ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-romance"
          : "border-border bg-background hover:border-muted-foreground/30"
      }`}
    >
      <div className="relative h-16 w-full overflow-hidden rounded-md">
        {/* Sample scene: sky gradient + ground, filtered with CSS */}
        <div
          className="absolute inset-0"
          style={{ filter: FILTER_CSS[filterId] }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-sky-400 via-orange-200 to-amber-800" />
          <div className="absolute bottom-0 h-[40%] w-full bg-linear-to-t from-green-800 to-green-600 opacity-70" />
          <div className="absolute left-[20%] top-[15%] h-5 w-5 rounded-full bg-yellow-200 opacity-90" />
        </div>
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Check className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className={`text-xs font-medium leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
          {name}
        </p>
        <p className="text-[10px] leading-tight text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}

export function CreateSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateSession()

  const [title, setTitle] = useState("")
  const [rollPreset, setRollPreset] = useState<number>(12)
  const [filterMode, setFilterMode] = useState<FilterMode>("fixed")
  const [fixedFilter, setFixedFilter] = useState<FilterId>("vintage")
  const [allowedFilters, setAllowedFilters] = useState<FilterId[]>([])
  const [password, setPassword] = useState("")

  function toggleAllowedFilter(id: FilterId) {
    setAllowedFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    )
  }

  const canSubmit =
    title.trim() &&
    !createMutation.isPending &&
    (filterMode === "fixed" ? !!fixedFilter : allowedFilters.length >= 2)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    createMutation.mutate(
      {
        title: title.trim(),
        roll_preset: rollPreset,
        filter_mode: filterMode,
        fixed_filter: filterMode === "fixed" ? fixedFilter : null,
        allowed_filters: filterMode === "preset" ? allowedFilters : null,
        password: password || null,
      },
      {
        onSuccess: () => {
          setTitle("")
          setRollPreset(12)
          setFilterMode("fixed")
          setFixedFilter("vintage")
          setAllowedFilters([])
          setPassword("")
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a wedding memory</DialogTitle>
          <DialogDescription>
            Set up your photo session. You can activate it when you're ready.
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
              {ROLL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRollPreset(preset)}
                  className={`flex h-11 min-h-[44px] items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200 ${
                    rollPreset === preset
                      ? "border-primary bg-primary text-primary-foreground shadow-romance"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Filter mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["fixed", "preset"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`flex h-11 min-h-[44px] items-center justify-center rounded-xl border text-sm font-medium transition-all duration-200 ${
                    filterMode === mode
                      ? "border-primary bg-primary text-primary-foreground shadow-romance"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {mode === "fixed" ? "One filter for all" : "Guests choose"}
                </button>
              ))}
            </div>
          </div>

          {filterMode === "fixed" && (
            <div className="flex flex-col gap-2">
              <Label>Choose a filter</Label>
              <p className="text-xs text-muted-foreground">
                All guest photos will use this filter.
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
          )}

          {filterMode === "preset" && (
            <div className="flex flex-col gap-2">
              <Label>Choose filters for guests</Label>
              <p className="text-xs text-muted-foreground">
                Pick 2-5 filters. Guests choose from these at capture time.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {MVP_PRESETS.map((preset) => (
                  <FilterPreviewCard
                    key={preset.id}
                    filterId={preset.id}
                    name={preset.name}
                    description={preset.description}
                    selected={allowedFilters.includes(preset.id)}
                    onSelect={() => toggleAllowedFilter(preset.id)}
                  />
                ))}
              </div>
              {allowedFilters.length > 0 && allowedFilters.length < 2 && (
                <p className="text-xs text-destructive">Select at least 2 filters.</p>
              )}
            </div>
          )}

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
  )
}
