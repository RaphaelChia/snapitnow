import "server-only"
import { createServerClient } from "@/lib/db"
import { getReferralDiscountPercentForHost } from "@/lib/db/queries/referrals"

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
  hostId?: string
): Promise<ActivationPricing> {
  const baseCents = BASE_PRICES[rollPreset]
  if (!baseCents) {
    throw new Error(`Unsupported roll preset for pricing: ${rollPreset}`)
  }

  const referralDiscountPercent = hostId
    ? await getReferralDiscountPercentForHost(hostId)
    : 0

  let discountPercent = referralDiscountPercent
  let discountLabel: string | null =
    referralDiscountPercent > 0 ? `Referral ${referralDiscountPercent}% off` : null

  if (referralDiscountPercent === 0) {
    const db = createServerClient()
    const { data } = await db
      .from("discounts")
      .select("discount_percent, label")
      .eq("roll_preset", rollPreset)
      .eq("active", true)
      .maybeSingle()

    discountPercent = data?.discount_percent ?? 0
    discountLabel = data?.label ?? null
  }

  const discountCents = Math.round(baseCents * (discountPercent / 100))
  const finalCents = Math.max(0, baseCents - discountCents)

  return {
    baseCents,
    discountCents,
    finalCents,
    discountLabel,
    currency: "sgd",
  }
}
