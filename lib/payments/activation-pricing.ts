import "server-only"

export type ActivationPricing = {
  amountInCents: number
  currency: "sgd"
}

export function getActivationPricing(rollPreset: number): ActivationPricing {
  if (rollPreset === 8) {
    return { amountInCents: 5900, currency: "sgd" }
  }
  if (rollPreset === 12) {
    return { amountInCents: 6500, currency: "sgd" }
  }
  if (rollPreset === 24) {
    return { amountInCents: 7200, currency: "sgd" }
  }
  if (rollPreset === 36) {
    return { amountInCents: 7900, currency: "sgd" }
  }

  throw new Error(`Unsupported roll preset for pricing: ${rollPreset}`)
}
