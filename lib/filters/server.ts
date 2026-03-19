import "server-only"
import type { Sharp } from "sharp"
import type { FilterId } from "./presets"

type SharpPipeline = (img: Sharp) => Sharp

export const FILTER_PIPELINES: Record<FilterId, SharpPipeline> = {
  "none": (img) => img,

  "disposable-starter": (img) =>
    img
      .modulate({ saturation: 0.94, brightness: 1.04 })
      .tint({ r: 244, g: 222, b: 186 })
      .gamma(1.2)
      .linear(1.08, -(128 * 1.08 - 130)),

  "vintage": (img) =>
    img
      .modulate({ saturation: 0.8, brightness: 0.95 })
      .tint({ r: 220, g: 200, b: 160 })
      .gamma(1.4),

  "bw-classic": (img) =>
    img
      .greyscale()
      .modulate({ brightness: 1.05 })
      .gamma(1.6),

  "bw-high-contrast": (img) =>
    img
      .greyscale()
      .linear(1.4, -(128 * 1.4 - 128))
      .modulate({ brightness: 0.95 }),

  "cool-tone": (img) =>
    img
      .modulate({ saturation: 0.8, brightness: 1.05 })
      .tint({ r: 180, g: 200, b: 230 }),

  "warm-fade": (img) =>
    img
      .modulate({ saturation: 1.1, brightness: 1.1 })
      .tint({ r: 240, g: 220, b: 180 })
      .gamma(1.3),

  "vivid": (img) =>
    img
      .modulate({ saturation: 1.5, brightness: 1.05 })
      .linear(1.15, -(128 * 1.15 - 128)),
}
