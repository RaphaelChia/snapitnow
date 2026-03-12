import "server-only"
import { z } from "zod"
import { createServerClient } from "../index"
import type { Database } from "../types"

const checkoutMetadataSchema = z.object({
  sessionId: z.string().uuid(),
  hostId: z.string().min(1),
  paymentType: z.string().min(1),
})

export const ACTIVATION_PAYMENT_TYPE = "one_time_session"
const STRIPE_WEBHOOK_STATUS_PROCESSING = "processing"
type RawEventSnapshot = Exclude<
  Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"],
  undefined
>

type ProcessCheckoutSessionCompletedInput = {
  stripeCheckoutSessionId: string
  stripePaymentIntentId: string | null
  amount: number
  currency: string
  metadata: Record<string, string> | null
  rawEventSnapshot: RawEventSnapshot
}

type ProcessCheckoutSessionExpiredInput = {
  stripeCheckoutSessionId: string
  rawEventSnapshot: RawEventSnapshot
}

type ProcessPaymentFailedInput = {
  stripePaymentIntentId: string
  metadata: Record<string, string> | null
  rawEventSnapshot: RawEventSnapshot
}

type ProcessRefundInput = {
  stripeChargeId: string
  stripePaymentIntentId: string | null
  refundedAmount: number
  isFullyRefunded: boolean
  rawEventSnapshot: RawEventSnapshot
}

type ProcessDisputeCreatedInput = {
  stripeDisputeId: string
  stripeChargeId: string
  stripePaymentIntentId: string | null
  reason: string | null
  amount: number
  rawEventSnapshot: RawEventSnapshot
}

type ProcessDisputeClosedInput = {
  stripeDisputeId: string
  isWon: boolean
  rawEventSnapshot: RawEventSnapshot
}

type StripeEventStatus = Database["public"]["Tables"]["stripe_webhook_events"]["Insert"]["status"]

type CreatePendingActivationPaymentInput = {
  sessionId: string
  hostId: string
  amount: number
  currency: string
  checkoutSessionId: string
}

function toLowerCurrency(input: string): string {
  return input.trim().toLowerCase()
}

type PendingPaymentLookupInput = {
  sessionId: string
  hostId: string
  paymentType: string
}

type PendingPaymentSummary = {
  id: string
  session_id: string
  host_id: string
  payment_type: string
  status: string
  stripe_checkout_session_id: string | null
}

export type PendingPaymentForReconcile = {
  id: string
  stripe_checkout_session_id: string
  created_at: string
}

type ClaimStripeWebhookEventResult =
  | "claimed"
  | "duplicate_processed"
  | "already_processing"

export async function claimStripeWebhookEvent(
  stripeEventId: string,
  eventType: string,
): Promise<ClaimStripeWebhookEventResult> {
  const db = createServerClient()
  const webhookEventInsert: Database["public"]["Tables"]["stripe_webhook_events"]["Insert"] = {
    stripe_event_id: stripeEventId,
    event_type: eventType,
    status: STRIPE_WEBHOOK_STATUS_PROCESSING,
  }

  const { error } = await db.from("stripe_webhook_events").insert(webhookEventInsert)
  if (!error) return "claimed"

  if (error.code !== "23505") throw error

  const { data: existing, error: existingError } = await db
    .from("stripe_webhook_events")
    .select("status")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle()

  if (existingError) throw existingError
  if (!existing) return "already_processing"
  if (existing.status === "processed") return "duplicate_processed"
  if (existing.status === STRIPE_WEBHOOK_STATUS_PROCESSING) return "already_processing"

  const { data: claimedExisting, error: claimExistingError } = await db
    .from("stripe_webhook_events")
    .update({
      status: STRIPE_WEBHOOK_STATUS_PROCESSING,
      processed_at: null,
      error_message: null,
    })
    .eq("stripe_event_id", stripeEventId)
    .in("status", ["failed", "ignored"])
    .select("stripe_event_id")
    .maybeSingle()

  if (claimExistingError) throw claimExistingError
  if (!claimedExisting) return "already_processing"

  return "claimed"
}

export async function createPendingActivationPayment(
  input: CreatePendingActivationPaymentInput,
): Promise<void> {
  const db = createServerClient()
  const paymentInsert: Database["public"]["Tables"]["payments"]["Insert"] = {
    session_id: input.sessionId,
    host_id: input.hostId,
    provider: "stripe",
    checkout_session_id: input.checkoutSessionId,
    stripe_checkout_session_id: input.checkoutSessionId,
    amount: input.amount,
    currency: toLowerCurrency(input.currency),
    status: "pending",
    payment_type: "one_time_session",
  }

  const { error } = await db.from("payments").insert(paymentInsert)
  if (error) throw error
}

export async function findPendingPaymentByReason(
  input: PendingPaymentLookupInput,
): Promise<PendingPaymentSummary | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from("payments")
    .select("id, session_id, host_id, payment_type, status, stripe_checkout_session_id")
    .eq("session_id", input.sessionId)
    .eq("host_id", input.hostId)
    .eq("payment_type", input.paymentType)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listPendingActivationPaymentsForReconcile(
  olderThanIso: string,
  limit: number,
): Promise<PendingPaymentForReconcile[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from("payments")
    .select("id, stripe_checkout_session_id, created_at")
    .eq("payment_type", ACTIVATION_PAYMENT_TYPE)
    .eq("status", "pending")
    .not("stripe_checkout_session_id", "is", null)
    .lt("created_at", olderThanIso)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) throw error

  return data
    .filter((row): row is PendingPaymentForReconcile => !!row.stripe_checkout_session_id)
    .map((row) => ({
      id: row.id,
      stripe_checkout_session_id: row.stripe_checkout_session_id,
      created_at: row.created_at,
    }))
}

export async function expirePendingPaymentById(paymentId: string): Promise<void> {
  const db = createServerClient()
  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    status: "expired",
  }

  const { error } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("id", paymentId)
    .eq("status", "pending")

  if (error) throw error
}

export async function finalizeStripeWebhookEvent(
  stripeEventId: string,
  status: StripeEventStatus,
  errorMessage?: string,
): Promise<void> {
  const db = createServerClient()
  const webhookEventUpdate: Database["public"]["Tables"]["stripe_webhook_events"]["Update"] = {
    status,
    processed_at: new Date().toISOString(),
    error_message: errorMessage ?? null,
  }

  const { error } = await db
    .from("stripe_webhook_events")
    .update(webhookEventUpdate)
    .eq("stripe_event_id", stripeEventId)

  if (error) throw error
}

export async function processCheckoutSessionCompleted(
  input: ProcessCheckoutSessionCompletedInput,
): Promise<void> {
  const db = createServerClient()
  const parsedMetadata = checkoutMetadataSchema.safeParse(input.metadata ?? {})
  if (!parsedMetadata.success) {
    throw new Error("Missing or invalid checkout metadata for session activation")
  }
  const { error } = await db.rpc("finalize_activation_payment", {
    p_checkout_session_id: input.stripeCheckoutSessionId,
    p_payment_intent_id: input.stripePaymentIntentId,
    p_amount: input.amount,
    p_currency: toLowerCurrency(input.currency),
    p_payment_type: parsedMetadata.data.paymentType,
    p_session_id: parsedMetadata.data.sessionId,
    p_host_id: parsedMetadata.data.hostId,
    p_raw_event_snapshot: input.rawEventSnapshot,
  })

  if (error) throw error
}

export async function processCheckoutSessionExpired(
  input: ProcessCheckoutSessionExpiredInput,
): Promise<void> {
  const db = createServerClient()
  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    status: "expired",
    stripe_checkout_session_id: input.stripeCheckoutSessionId,
    raw_event_snapshot: input.rawEventSnapshot,
  }

  const { error } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
    .eq("status", "pending")

  if (error) throw error
}

export async function processPaymentIntentFailed(
  input: ProcessPaymentFailedInput,
): Promise<void> {
  const db = createServerClient()
  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    status: "failed",
    stripe_payment_intent_id: input.stripePaymentIntentId,
    raw_event_snapshot: input.rawEventSnapshot,
  }

  const { error } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_payment_intent_id", input.stripePaymentIntentId)
    .eq("status", "pending")
    .select("id")

  if (error) throw error

  const parsedMetadata = checkoutMetadataSchema.safeParse(input.metadata ?? {})
  if (!parsedMetadata.success) return

  const { error: fallbackError } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("session_id", parsedMetadata.data.sessionId)
    .eq("host_id", parsedMetadata.data.hostId)
    .eq("payment_type", parsedMetadata.data.paymentType)
    .eq("status", "pending")

  if (fallbackError) throw fallbackError
}

export async function processChargeRefunded(input: ProcessRefundInput): Promise<void> {
  const db = createServerClient()
  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    status: input.isFullyRefunded ? "refunded" : "partially_refunded",
    refunded_amount: input.refundedAmount,
    refunded_at: new Date().toISOString(),
    stripe_charge_id: input.stripeChargeId,
    raw_event_snapshot: input.rawEventSnapshot,
  }

  const { data, error } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_charge_id", input.stripeChargeId)
    .select("id")

  if (error) throw error
  if ((data?.length ?? 0) > 0) return

  if (!input.stripePaymentIntentId) return

  const { error: fallbackError } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_payment_intent_id", input.stripePaymentIntentId)

  if (fallbackError) throw fallbackError
}

export async function processDisputeCreated(
  input: ProcessDisputeCreatedInput,
): Promise<void> {
  const db = createServerClient()
  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    status: "disputed",
    stripe_dispute_id: input.stripeDisputeId,
    stripe_charge_id: input.stripeChargeId,
    disputed_at: new Date().toISOString(),
    dispute_reason: input.reason,
    dispute_amount: input.amount,
    raw_event_snapshot: input.rawEventSnapshot,
  }

  const { data, error } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_charge_id", input.stripeChargeId)
    .select("id")

  if (error) throw error
  if ((data?.length ?? 0) > 0) return

  if (!input.stripePaymentIntentId) return

  const { error: fallbackError } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_payment_intent_id", input.stripePaymentIntentId)

  if (fallbackError) throw fallbackError
}

export async function processDisputeClosed(input: ProcessDisputeClosedInput): Promise<void> {
  const db = createServerClient()
  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    status: input.isWon ? "won_dispute" : "lost_dispute",
    dispute_closed_at: new Date().toISOString(),
    stripe_dispute_id: input.stripeDisputeId,
    raw_event_snapshot: input.rawEventSnapshot,
  }

  const { error } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_dispute_id", input.stripeDisputeId)

  if (error) throw error
}
