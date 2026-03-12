import "server-only"
import { env } from "@/lib/env"
import { getStripeClient } from "@/lib/payments/stripe"
import type { Session } from "@/lib/db/types"
import { getActivationPricing } from "@/lib/payments/activation-pricing"

type CreateActivationCheckoutSessionInput = {
  session: Session
  hostId: string
}

type ActivationCheckoutSessionResult = {
  checkoutSessionId: string
  checkoutUrl: string
  amount: number
  currency: string
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

  const checkoutSession = await stripe.checkout.sessions.create({
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
  })

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
