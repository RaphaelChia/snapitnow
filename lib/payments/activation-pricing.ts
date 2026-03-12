import "server-only"
import { createServerClient } from "@/lib/db"

export type ActivationPricing = {
  baseCents: number
  discountCents: number
  finalCents: number
  discountLabel: string | null
  currency: "sgd"
}

const FALLBACK_PRICES: Record<number, number> = {
  8: 5900,
  12: 6500,
  24: 7200,
  36: 7900,
}

export async function getActivationPricing(
  rollPreset: number,
): Promise<ActivationPricing> {
  const db = createServerClient()

  const { data } = await db
    .from("pricing_tiers")
    .select("base_amount_cents, discount_cents, discount_label, currency")
    .eq("roll_preset", rollPreset)
    .eq("active", true)
    .single()

  if (data) {
    const finalCents = Math.max(0, data.base_amount_cents - data.discount_cents)
    return {
      baseCents: data.base_amount_cents,
      discountCents: data.discount_cents,
      finalCents,
      discountLabel: data.discount_label,
      currency: data.currency as "sgd",
    }
  }

  const fallback = FALLBACK_PRICES[rollPreset]
  if (!fallback) {
    throw new Error(`Unsupported roll preset for pricing: ${rollPreset}`)
  }

  return {
    baseCents: fallback,
    discountCents: 0,
    finalCents: fallback,
    discountLabel: null,
    currency: "sgd",
  }
}
