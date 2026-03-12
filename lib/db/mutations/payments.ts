import "server-only"
import { z } from "zod"
import { createServerClient } from "../index"
import type { Database } from "../types"

const checkoutMetadataSchema = z.object({
  sessionId: z.string().uuid(),
  hostId: z.string().min(1),
  paymentType: z.literal("one_time_session"),
})

type ProcessCheckoutSessionCompletedInput = {
  stripeCheckoutSessionId: string
  stripePaymentIntentId: string | null
  amount: number
  currency: string
  metadata: Record<string, string> | null
  rawEventSnapshot: Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"]
}

type ProcessCheckoutSessionExpiredInput = {
  stripeCheckoutSessionId: string
  rawEventSnapshot: Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"]
}

type ProcessPaymentFailedInput = {
  stripePaymentIntentId: string
  rawEventSnapshot: Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"]
}

type ProcessRefundInput = {
  stripeChargeId: string
  stripePaymentIntentId: string | null
  refundedAmount: number
  isFullyRefunded: boolean
  rawEventSnapshot: Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"]
}

type ProcessDisputeCreatedInput = {
  stripeDisputeId: string
  stripeChargeId: string
  stripePaymentIntentId: string | null
  reason: string | null
  amount: number
  rawEventSnapshot: Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"]
}

type ProcessDisputeClosedInput = {
  stripeDisputeId: string
  isWon: boolean
  rawEventSnapshot: Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"]
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

export async function claimStripeWebhookEvent(
  stripeEventId: string,
  eventType: string,
): Promise<boolean> {
  const db = createServerClient()
  const webhookEventInsert: Database["public"]["Tables"]["stripe_webhook_events"]["Insert"] = {
    stripe_event_id: stripeEventId,
    event_type: eventType,
    status: "ignored",
  }

  const { error } = await db.from("stripe_webhook_events").insert(webhookEventInsert)
  if (!error) return true

  if (error.code === "23505") {
    return false
  }

  throw error
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

  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    status: "succeeded",
    paid_at: new Date().toISOString(),
    stripe_checkout_session_id: input.stripeCheckoutSessionId,
    stripe_payment_intent_id: input.stripePaymentIntentId,
    amount: input.amount,
    currency: toLowerCurrency(input.currency),
    payment_type: parsedMetadata.data.paymentType,
    raw_event_snapshot: input.rawEventSnapshot,
  }

  const { data: existingPayment, error: existingPaymentError } = await db
    .from("payments")
    .select("id, host_id, session_id, payment_type, status")
    .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
    .maybeSingle()

  if (existingPaymentError) throw existingPaymentError
  if (!existingPayment) {
    throw new Error(
      `No pending payment found for checkout session ${input.stripeCheckoutSessionId}`,
    )
  }

  if (existingPayment.payment_type !== "one_time_session") {
    throw new Error(`Unsupported payment_type for phase 2: ${existingPayment.payment_type}`)
  }
  if (existingPayment.host_id !== parsedMetadata.data.hostId) {
    throw new Error("Checkout metadata host does not match payment host")
  }
  if (existingPayment.session_id !== parsedMetadata.data.sessionId) {
    throw new Error("Checkout metadata session does not match payment session")
  }
  if (existingPayment.status !== "pending") {
    return
  }

  const { error: paymentUpdateError } = await db
    .from("payments")
    .update(paymentUpdate)
    .eq("id", existingPayment.id)
    .eq("status", "pending")

  if (paymentUpdateError) throw paymentUpdateError

  const { error: sessionActivationError } = await db
    .from("sessions")
    .update({
      status: "active",
      activated_at: new Date().toISOString(),
    })
    .eq("id", parsedMetadata.data.sessionId)
    .eq("host_id", parsedMetadata.data.hostId)
    .eq("status", "draft")

  if (sessionActivationError) throw sessionActivationError
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

  if (error) throw error
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
