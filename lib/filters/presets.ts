export type FilterId =
  | "none"
  | "vintage"
  | "bw-classic"
  | "bw-high-contrast"
  | "cool-tone"
  | "warm-fade"
  | "vivid"

export type FilterPreset = {
  id: FilterId
  name: string
  description: string
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", name: "No Filter", description: "Original unmodified photo" },
  { id: "vintage", name: "Vintage", description: "Warm muted tones, slight fade" },
  { id: "bw-classic", name: "B&W Classic", description: "Soft black and white" },
  { id: "bw-high-contrast", name: "B&W Bold", description: "High contrast monochrome" },
  { id: "cool-tone", name: "Cool Tone", description: "Blue-shifted, desaturated" },
  { id: "warm-fade", name: "Warm Fade", description: "Golden highlights, lifted blacks" },
  { id: "vivid", name: "Vivid", description: "Punchy saturation and contrast" },
]

export const MVP_FILTER_IDS: FilterId[] = [
  "none",
  "vintage",
  "bw-classic",
  "bw-high-contrast",
  "cool-tone",
  "warm-fade",
]
