import { NextRequest, NextResponse } from "next/server"
import {
  claimStripeWebhookEvent,
  finalizeStripeWebhookEvent,
  processChargeRefunded,
  processCheckoutSessionCompleted,
  processCheckoutSessionExpired,
  processDisputeClosed,
  processDisputeCreated,
  processPaymentIntentFailed,
} from "@/lib/db/mutations/payments"
import type { Database } from "@/lib/db/types"
import { getStripeClient, getStripeWebhookSecret } from "@/lib/payments/stripe"

function getStripeSignature(req: NextRequest): string {
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    throw new Error("Missing stripe-signature header")
  }
  return signature
}

function buildRawSnapshot(event: { id: string; type: string; created: number }) {
  const snapshot: Database["public"]["Tables"]["payments"]["Insert"]["raw_event_snapshot"] = {
    id: event.id,
    type: event.type,
    created: event.created,
  }
  return snapshot
}

function normalizeWebhookError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500)
  if (typeof error === "string") return error.slice(0, 500)
  return "Unknown webhook processing error"
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient()
  const webhookSecret = getStripeWebhookSecret()

  let eventId: string | null = null
  let eventType: string | null = null
  let processingStage = "signature_verification"

  try {
    const signature = getStripeSignature(req)
    const payload = await req.text()
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    eventId = event.id
    eventType = event.type

    const claimResult = await claimStripeWebhookEvent(event.id, event.type)
    if (claimResult !== "claimed") {
      return NextResponse.json({ ok: true, duplicate: true, state: claimResult })
    }

    const rawEventSnapshot = buildRawSnapshot(event)
    processingStage = "event_dispatch"

    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      if (session.object !== "checkout.session") {
        throw new Error("Unexpected payload for checkout.session.completed")
      }

      if (!session.id || typeof session.amount_total !== "number" || !session.currency) {
        throw new Error("Incomplete checkout session payload")
      }

      processingStage = "checkout.session.completed"
      await processCheckoutSessionCompleted({
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        amount: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
        rawEventSnapshot,
      })
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object
      if (session.object !== "checkout.session" || !session.id) {
        throw new Error("Unexpected payload for checkout.session.expired")
      }

      processingStage = "checkout.session.expired"
      await processCheckoutSessionExpired({
        stripeCheckoutSessionId: session.id,
        rawEventSnapshot,
      })
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object
      if (paymentIntent.object !== "payment_intent" || !paymentIntent.id) {
        throw new Error("Unexpected payload for payment_intent.payment_failed")
      }

      processingStage = "payment_intent.payment_failed"
      await processPaymentIntentFailed({
        stripePaymentIntentId: paymentIntent.id,
        metadata: paymentIntent.metadata,
        rawEventSnapshot,
      })
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object
      if (
        charge.object !== "charge" ||
        !charge.id ||
        typeof charge.amount_refunded !== "number"
      ) {
        throw new Error("Unexpected payload for charge.refunded")
      }

      processingStage = "charge.refunded"
      await processChargeRefunded({
        stripeChargeId: charge.id,
        stripePaymentIntentId:
          typeof charge.payment_intent === "string" ? charge.payment_intent : null,
        refundedAmount: charge.amount_refunded,
        isFullyRefunded: charge.refunded === true,
        rawEventSnapshot,
      })
    } else if (event.type === "charge.dispute.created") {
      const dispute = event.data.object
      if (
        dispute.object !== "dispute" ||
        !dispute.id ||
        typeof dispute.charge !== "string" ||
        typeof dispute.amount !== "number"
      ) {
        throw new Error("Unexpected payload for charge.dispute.created")
      }

      processingStage = "charge.dispute.created"
      await processDisputeCreated({
        stripeDisputeId: dispute.id,
        stripeChargeId: dispute.charge,
        stripePaymentIntentId:
          typeof dispute.payment_intent === "string" ? dispute.payment_intent : null,
        reason: dispute.reason ?? null,
        amount: dispute.amount,
        rawEventSnapshot,
      })
    } else if (event.type === "charge.dispute.closed") {
      const dispute = event.data.object
      if (dispute.object !== "dispute" || !dispute.id || typeof dispute.status !== "string") {
        throw new Error("Unexpected payload for charge.dispute.closed")
      }

      processingStage = "charge.dispute.closed"
      await processDisputeClosed({
        stripeDisputeId: dispute.id,
        isWon: dispute.status === "won",
        rawEventSnapshot,
      })
    }

    processingStage = "finalize_processed"
    await finalizeStripeWebhookEvent(event.id, "processed")
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalizedError = normalizeWebhookError(error)
    console.error("Stripe webhook processing failed", {
      eventId,
      eventType,
      processingStage,
      error: normalizedError,
    })
    if (eventId) {
      try {
        await finalizeStripeWebhookEvent(
          eventId,
          "failed",
          `[${processingStage}] ${normalizedError}`,
        )
      } catch (finalizeError) {
        console.error("Failed to mark stripe webhook as failed:", finalizeError)
      }
    }

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}
