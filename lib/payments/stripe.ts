import "server-only"
import Stripe from "stripe"
import { env } from "@/lib/env"

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY)
  }

  return stripeClient
}

export function getStripeWebhookSecret(): string {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET")
  }

  return env.STRIPE_WEBHOOK_SECRET
}
