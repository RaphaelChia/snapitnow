import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"

type ReferralCodeRow = Database["public"]["Tables"]["referral_codes"]["Row"]

export type ReferralOverview = {
  code: string
  discountPercent: number
  isReferralMember: boolean
  referredByHostId: string | null
  referredAt: string | null
  referralSourceCode: string | null
}

function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase()
}

export async function getReferralCodeByHostId(
  hostId: string
): Promise<ReferralCodeRow | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from("referral_codes")
    .select("*")
    .eq("host_id", hostId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getActiveReferralCodeByValue(
  code: string
): Promise<ReferralCodeRow | null> {
  const normalized = normalizeReferralCode(code)
  const db = createServerClient()
  const { data, error } = await db
    .from("referral_codes")
    .select("*")
    .eq("code", normalized)
    .eq("active", true)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getReferralDiscountPercentForHost(
  hostId: string
): Promise<number> {
  const db = createServerClient()
  const { data, error } = await db
    .from("hosts")
    .select("referred_at,referral_source_code")
    .eq("id", hostId)
    .maybeSingle()

  if (error) throw error
  if (!data?.referred_at || !data.referral_source_code) return 0
  return 15
}

export async function getReferralOverviewForHost(
  hostId: string
): Promise<ReferralOverview> {
  const db = createServerClient()
  const [{ data: hostRow, error: hostError }, { data: ownCode, error: codeError }] =
    await Promise.all([
      db
        .from("hosts")
        .select("referred_by_host_id,referred_at,referral_source_code")
        .eq("id", hostId)
        .single(),
      db.from("referral_codes").select("*").eq("host_id", hostId).maybeSingle(),
    ])

  if (hostError) throw hostError
  if (codeError) throw codeError

  return {
    code: ownCode?.code ?? "",
    discountPercent: hostRow.referred_at && hostRow.referral_source_code ? 15 : 0,
    isReferralMember: !!hostRow.referred_at && !!hostRow.referral_source_code,
    referredByHostId: hostRow.referred_by_host_id,
    referredAt: hostRow.referred_at,
    referralSourceCode: hostRow.referral_source_code,
  }
}
