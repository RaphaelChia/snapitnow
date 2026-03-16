import "server-only"
import { createServerClient } from "../index"
import type { Database } from "../types"
import { getActiveReferralCodeByValue, getReferralCodeByHostId } from "../queries/referrals"

type ReferralCodeRow = Database["public"]["Tables"]["referral_codes"]["Row"]

export type ClaimReferralResult =
  | "claimed"
  | "already_referred"
  | "invalid_code"
  | "self_referral"
  | "ineligible_paid"

function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase()
}

function buildCandidateCode(seed: string): string {
  const normalizedSeed = seed.toUpperCase().replace(/[^A-Z0-9]/g, "")
  const prefix = (normalizedSeed || "SNAP").slice(0, 6)
  const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)
  return `${prefix}${suffix}`
}

async function generateUniqueReferralCode(seed: string): Promise<string> {
  const db = createServerClient()
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const candidate = buildCandidateCode(seed)
    const { data, error } = await db
      .from("referral_codes")
      .select("id")
      .eq("code", candidate)
      .maybeSingle()
    if (error) throw error
    if (!data) return candidate
  }
  throw new Error("Unable to generate a unique referral code")
}

export async function ensureHostReferralCode(hostId: string): Promise<ReferralCodeRow> {
  const existing = await getReferralCodeByHostId(hostId)
  if (existing) return existing

  const db = createServerClient()
  const { data: host, error: hostError } = await db
    .from("hosts")
    .select("name")
    .eq("id", hostId)
    .single()
  if (hostError) throw hostError

  for (let attempts = 0; attempts < 3; attempts += 1) {
    const code = await generateUniqueReferralCode(host.name ?? "SNAP")
    const now = new Date().toISOString()
    const insertPayload: Database["public"]["Tables"]["referral_codes"]["Insert"] = {
      host_id: hostId,
      code,
      discount_percent: 15,
      active: true,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await db
      .from("referral_codes")
      .insert(insertPayload)
      .select("*")
      .single()

    if (!error) return data
    if (error.code !== "23505") throw error

    const raceWinner = await getReferralCodeByHostId(hostId)
    if (raceWinner) return raceWinner
  }

  throw new Error("Unable to create referral code")
}

export async function claimReferralForHost(input: {
  hostId: string
  referralCode: string
}): Promise<ClaimReferralResult> {
  const normalizedCode = normalizeReferralCode(input.referralCode)
  if (!normalizedCode) return "invalid_code"

  const db = createServerClient()
  const { data: host, error: hostError } = await db
    .from("hosts")
    .select("referred_at")
    .eq("id", input.hostId)
    .single()
  if (hostError) throw hostError

  if (host.referred_at) return "already_referred"

  const referralCode = await getActiveReferralCodeByValue(normalizedCode)
  if (!referralCode) return "invalid_code"
  if (referralCode.host_id === input.hostId) return "self_referral"

  const { data: succeededPayment, error: paymentError } = await db
    .from("payments")
    .select("id")
    .eq("host_id", input.hostId)
    .eq("status", "succeeded")
    .limit(1)
    .maybeSingle()
  if (paymentError) throw paymentError
  if (succeededPayment) return "ineligible_paid"

  const { data: updatedHost, error: updateError } = await db
    .from("hosts")
    .update({
      referred_by_host_id: referralCode.host_id,
      referred_at: new Date().toISOString(),
      referral_source_code: normalizedCode,
    })
    .eq("id", input.hostId)
    .is("referred_at", null)
    .select("id")
    .maybeSingle()

  if (updateError) throw updateError
  if (!updatedHost) return "already_referred"

  return "claimed"
}
