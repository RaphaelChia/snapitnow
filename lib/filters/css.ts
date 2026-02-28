import type { FilterId } from "./presets"

export const FILTER_CSS: Record<FilterId, string> = {
  "none": "none",
  "vintage": "sepia(0.35) contrast(1.1) brightness(0.95) saturate(0.8)",
  "bw-classic": "grayscale(1) contrast(1.15) brightness(1.05)",
  "bw-high-contrast": "grayscale(1) contrast(1.5) brightness(0.95)",
  "cool-tone": "hue-rotate(15deg) saturate(0.8) brightness(1.05) contrast(1.05)",
  "warm-fade": "sepia(0.15) saturate(1.1) brightness(1.1) contrast(0.9)",
  "vivid": "saturate(1.5) contrast(1.15) brightness(1.05)",
}
