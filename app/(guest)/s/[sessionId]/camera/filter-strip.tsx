"use client"

import { FILTER_PRESETS, type FilterId } from "@/lib/filters/presets"
import { FILTER_CSS } from "@/lib/filters/css"
import { cn } from "@/lib/utils"

interface FilterStripProps {
  allowedFilters: FilterId[]
  activeFilterId: FilterId
  onSelect: (id: FilterId) => void
}

export function FilterStrip({
  allowedFilters,
  activeFilterId,
  onSelect,
}: FilterStripProps) {
  const presets = FILTER_PRESETS.filter((p) => allowedFilters.includes(p.id))

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pt-3 no-scrollbar">
      {presets.map((preset) => {
        const isActive = preset.id === activeFilterId
        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "flex min-h-11 shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-transparent px-3.5 py-2.5 transition-all duration-200",
              isActive
                ? "border-white/30 bg-white/18 ring-1 ring-primary/45"
                : "bg-white/8 hover:bg-white/14",
            )}
          >
            <div
              className="h-10 w-10 rounded-full bg-linear-to-br from-neutral-300 to-neutral-600"
              style={{ filter: FILTER_CSS[preset.id] }}
            />
            <span
              className={cn(
                "text-xs font-medium leading-tight",
                isActive ? "text-white" : "text-white/75",
              )}
            >
              {preset.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
