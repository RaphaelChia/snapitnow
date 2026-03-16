export const ROLL_PRESET_VALUES = [8, 12, 24, 36] as const

export type RollPreset = (typeof ROLL_PRESET_VALUES)[number]
export type RollPresetString = `${RollPreset}`

const ROLL_PRESET_SET = new Set<number>(ROLL_PRESET_VALUES)

const ROLL_PRESET_BY_STRING: Record<RollPresetString, RollPreset> = {
  "8": 8,
  "12": 12,
  "24": 24,
  "36": 36,
}

export function isRollPreset(value: number): value is RollPreset {
  return ROLL_PRESET_SET.has(value)
}

export function parseRollPreset(value: number): RollPreset {
  if (!isRollPreset(value)) {
    throw new Error(`Unsupported roll preset: ${value}`)
  }
  return value
}

export function parseRollPresetString(value: RollPresetString): RollPreset {
  return ROLL_PRESET_BY_STRING[value]
}
