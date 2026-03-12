import "server-only"
import { createServerClient } from "@/lib/db"

export type ActivationPricing = {
  baseCents: number
  discountCents: number
  finalCents: number
  discountLabel: string | null
  currency: "sgd"
}

const BASE_PRICES: Record<number, number> = {
  8: 5900,
  12: 6500,
  24: 7200,
  36: 7900,
}

export async function getActivationPricing(
  rollPreset: number,
): Promise<ActivationPricing> {
  const baseCents = BASE_PRICES[rollPreset]
  if (!baseCents) {
    throw new Error(`Unsupported roll preset for pricing: ${rollPreset}`)
  }

  const db = createServerClient()
  const { data } = await db
    .from("discounts")
    .select("discount_percent, label")
    .eq("roll_preset", rollPreset)
    .eq("active", true)
    .single()

  const discountPercent = data?.discount_percent ?? 0
  const discountCents = Math.round(baseCents * (discountPercent / 100))
  const finalCents = Math.max(0, baseCents - discountCents)

  return {
    baseCents,
    discountCents,
    finalCents,
    discountLabel: data?.label ?? null,
    currency: "sgd",
  }
}
