import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getStripeClient } from "@/lib/payments/stripe"
import {
  listPendingActivationPaymentsForReconcile,
  processCheckoutSessionCompleted,
  processCheckoutSessionExpired,
} from "@/lib/db/mutations/payments"

const RECONCILE_LOOKBACK_MINUTES = 5
const RECONCILE_BATCH_SIZE = 50

function buildReconcileSnapshot(checkoutSessionId: string) {
  return {
    id: `reconcile:${checkoutSessionId}`,
    type: "reconcile.checkout.session",
    created: Math.floor(Date.now() / 1000),
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stripe = getStripeClient()
  const olderThanIso = new Date(
    Date.now() - RECONCILE_LOOKBACK_MINUTES * 60 * 1000,
  ).toISOString()

  const result = {
    scanned: 0,
    reconciledToSucceeded: 0,
    reconciledToExpired: 0,
    skipped: 0,
    failed: 0,
  }

  try {
    const pendingPayments = await listPendingActivationPaymentsForReconcile(
      olderThanIso,
      RECONCILE_BATCH_SIZE,
    )

    result.scanned = pendingPayments.length

    for (const payment of pendingPayments) {
      try {
        const session = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id)
        const snapshot = buildReconcileSnapshot(session.id)

        if (
          session.status === "complete" &&
          typeof session.amount_total === "number" &&
          !!session.currency
        ) {
          await processCheckoutSessionCompleted({
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            amount: session.amount_total,
            currency: session.currency,
            metadata: session.metadata,
            rawEventSnapshot: snapshot,
          })
          result.reconciledToSucceeded += 1
          continue
        }

        if (session.status === "expired") {
          await processCheckoutSessionExpired({
            stripeCheckoutSessionId: session.id,
            rawEventSnapshot: snapshot,
          })
          result.reconciledToExpired += 1
          continue
        }

        result.skipped += 1
      } catch (error) {
        result.failed += 1
        console.error("Stripe reconcile item failed", {
          paymentId: payment.id,
          checkoutSessionId: payment.stripe_checkout_session_id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Stripe reconciliation cron failed", error)
    return NextResponse.json({ error: "Stripe reconciliation failed" }, { status: 500 })
  }
}
