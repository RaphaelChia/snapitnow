"use client"

import { FILTER_PRESETS, type FilterId } from "@/lib/filters/presets"
import { FILTER_CSS } from "@/lib/filters/css"
import { Button } from "@/components/ui/button"
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
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "px-3 py-1 text-xs font-bold border-b-2 transition-all duration-200 whitespace-nowrap uppercase tracking-wider",
              isActive
                ? "bg-analog-surface-container-high text-analog-primary border-analog-primary"
                : "bg-analog-surface-container-lowest text-analog-outline border-transparent hover:text-analog-tertiary",
            )}
          >
            {preset.name}
          </button>
        )
      })}
    </div>
  )
}
