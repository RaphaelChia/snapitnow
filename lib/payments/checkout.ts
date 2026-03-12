import "server-only"
import { env } from "@/lib/env"
import { getStripeClient } from "@/lib/payments/stripe"
import type { Session } from "@/lib/db/types"
import { getActivationPricing } from "@/lib/payments/activation-pricing"
import Stripe from "stripe"

type CreateActivationCheckoutSessionInput = {
  session: Session
  hostId: string
  idempotencyKey?: string
}

type ActivationCheckoutSessionResult = {
  checkoutSessionId: string
  checkoutUrl: string
  amount: number
  currency: string
}

type StripeCheckoutStatus = "open" | "complete" | "expired"

export type StripeCheckoutSnapshot = {
  id: string
  status: StripeCheckoutStatus | null
  url: string | null
}

function getAppBaseUrl(): string {
  return env.NEXT_PUBLIC_APP_URL ?? env.AUTH_URL
}

export async function createActivationCheckoutSession(
  input: CreateActivationCheckoutSessionInput,
): Promise<ActivationCheckoutSessionResult> {
  const stripe = getStripeClient()
  const pricing = getActivationPricing(input.session.roll_preset)
  const appBaseUrl = getAppBaseUrl()
  const sessionDetailPath = `/sessions/${input.session.id}`

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    success_url: `${appBaseUrl}${sessionDetailPath}?payment=success`,
    cancel_url: `${appBaseUrl}${sessionDetailPath}?payment=cancelled`,
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pricing.currency,
          unit_amount: pricing.amountInCents,
          product_data: {
            name: `SnapItNow session activation (${input.session.roll_preset} rolls)`,
            description: `One-time activation for "${input.session.title}"`,
          },
        },
      },
    ],
    metadata: {
      sessionId: input.session.id,
      hostId: input.hostId,
      paymentType: "one_time_session",
    },
  }

  const checkoutSession = input.idempotencyKey
    ? await stripe.checkout.sessions.create(checkoutParams, {
        idempotencyKey: input.idempotencyKey,
      })
    : await stripe.checkout.sessions.create(checkoutParams)

  if (!checkoutSession.url) {
    throw new Error("Stripe checkout session URL is missing")
  }

  return {
    checkoutSessionId: checkoutSession.id,
    checkoutUrl: checkoutSession.url,
    amount: pricing.amountInCents,
    currency: pricing.currency,
  }
}

export async function getCheckoutSessionSnapshot(
  checkoutSessionId: string,
): Promise<StripeCheckoutSnapshot | null> {
  const stripe = getStripeClient()

  try {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId)
    return {
      id: session.id,
      status: session.status,
      url: session.url ?? null,
    }
  } catch (error) {
    // If Stripe says this session does not exist, treat as non-reusable.
    if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
      return null
    }
    throw error
  }
}

export async function expireCheckoutSession(checkoutSessionId: string): Promise<void> {
  const stripe = getStripeClient()

  try {
    await stripe.checkout.sessions.expire(checkoutSessionId)
  } catch (error) {
    // Expire is best-effort; Stripe can reject if already completed/expired.
    if (
      error instanceof Stripe.errors.StripeError &&
      (error.code === "checkout_session_completed" ||
        error.code === "checkout_session_expired" ||
        error.code === "resource_missing")
    ) {
      return
    }
    throw error
  }
}
