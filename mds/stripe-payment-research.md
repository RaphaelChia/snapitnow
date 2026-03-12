# Stripe Payment State (Current Implementation)

## Scope

This document reflects the **implemented** Stripe activation-payment flow in this codebase as of the latest fixes.  
It focuses on correctness, idempotency, and operational recovery (not pricing experiments).

## What Is Live Now

- Session activation is a **one-time Stripe Checkout** flow (`payment_type = one_time_session`).
- Client-side activation is guarded against duplicate checkout creation by reusing/open-expiring logic.
- Webhook ingestion is idempotent via a `stripe_webhook_events` claim/finalize ledger.
- Payment finalization is centralized in SQL function `finalize_activation_payment(...)`.
- A cron reconcile endpoint heals pending records if Stripe webhook delivery is delayed/missed.
- Payment statuses include dispute/refund states and `duplicate_settlement`.

## Why These Fixes Exist

- **Duplicate prevention**: hosts can click multiple times or retry during slow networks.
- **Out-of-order resilience**: Stripe events may arrive later, retried, or duplicated.
- **Single source of truth**: session activation is driven by verified server-side payment state only.
- **Race-safe settlement**: SQL transaction + row lock prevents parallel success transitions.
- **Operational recovery**: cron reconciliation closes stuck `pending` payments.

## End-to-End Flow (Current)

1. Host requests activation from `createActivationCheckout` server action.
2. Existing pending payment is reused when Stripe checkout is still open and has a URL.
3. New Checkout Session is created only when there is no usable pending one.
4. Pending payment row is inserted (`status = pending`, `stripe_checkout_session_id` set).
5. Stripe webhook (`/api/stripe/webhook`) verifies signature and claims event idempotently.
6. On `checkout.session.completed`, app calls `processCheckoutSessionCompleted`.
7. DB RPC `finalize_activation_payment(...)` marks payment `succeeded` (or `duplicate_settlement`) and activates session if eligible.
8. Reconcile cron (`/api/cron/stripe-reconcile`) periodically checks stale pending payments against Stripe session status.

## Crucial Snippets With Reasoning

### 1) Checkout creation guard + race fallback

```ts
// app/(main)/sessions/actions.ts
const pendingPayment = await findPendingPaymentByReason({
  sessionId: session.id,
  hostId: userId,
  paymentType: ACTIVATION_PAYMENT_TYPE,
});

if (pendingPayment?.stripe_checkout_session_id) {
  const snapshot = await getCheckoutSessionSnapshot(
    pendingPayment.stripe_checkout_session_id
  );

  // Primary duplicate-prevention control:
  // if Stripe checkout is still open, return same URL instead of creating a second payable link.
  if (snapshot?.status === "open" && snapshot.url) {
    return { checkoutUrl: snapshot.url };
  }

  // If checkout is already complete, activation is in-flight or done; avoid new charge path.
  if (snapshot?.status === "complete") {
    throw new Error(
      "A payment is already completing for this session. Please refresh in a moment."
    );
  }
}
```

Reasoning: this avoids creating multiple active checkout links for the same session intent.

### 2) Webhook idempotency claim before processing

```ts
// app/api/stripe/webhook/route.ts
const claimResult = await claimStripeWebhookEvent(event.id, event.type);
if (claimResult !== "claimed") {
  // Duplicate delivery or another worker currently processing same event.
  // Return 200 to stop Stripe retry storms for handled duplicates.
  return NextResponse.json({ ok: true, duplicate: true, state: claimResult });
}
```

Reasoning: ensures at-most-once business processing per Stripe event id, even with retries or concurrent workers.

### 3) SQL finalization lock + duplicate settlement status

```sql
-- supabase/migrations/009_finalize_activation_payment_function.sql
select *
into v_payment
from payments
where stripe_checkout_session_id = p_checkout_session_id
for update; -- row lock blocks concurrent finalizers on same payment row

if exists (
  select 1
  from payments p
  where p.session_id = v_payment.session_id
    and p.payment_type = v_payment.payment_type
    and p.status = 'succeeded'
    and p.id <> v_payment.id
) then
  update payments
  set status = 'duplicate_settlement'
  where id = v_payment.id
    and status = 'pending';
  return 'duplicate_settlement';
end if;
```

Reasoning: if a second settlement arrives for the same session/payment reason, we preserve auditability (`duplicate_settlement`) instead of silently overwriting state.

### 4) Reconcile cron as safety net

```ts
// app/api/cron/stripe-reconcile/route.ts
const pendingPayments = await listPendingActivationPaymentsForReconcile(
  olderThanIso,
  RECONCILE_BATCH_SIZE
);

for (const payment of pendingPayments) {
  const session = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id);
  if (session.status === "complete") {
    await processCheckoutSessionCompleted({
      stripeCheckoutSessionId: session.id,
      // ...same finalization path as webhook...
    });
  } else if (session.status === "expired") {
    await processCheckoutSessionExpired({
      stripeCheckoutSessionId: session.id,
      // ...mark payment expired...
    });
  }
}
```

Reasoning: webhook delivery is reliable but not guaranteed to be timely under all failure modes; reconcile closes this gap.

## Event Mapping (Implemented)

- `checkout.session.completed` -> `processCheckoutSessionCompleted` -> SQL finalize RPC -> `succeeded` or `duplicate_settlement`; may activate session.
- `checkout.session.expired` -> `status = expired` for pending payment.
- `payment_intent.payment_failed` -> `status = failed` (with metadata fallback match path).
- `charge.refunded` -> `refunded` / `partially_refunded`.
- `charge.dispute.created` -> `disputed`.
- `charge.dispute.closed` -> `won_dispute` / `lost_dispute`.

## Status Enums (Current)

From migration `008_stripe_processing_and_duplicate_statuses.sql`:

- `stripe_webhook_events.status`: `processing`, `processed`, `ignored`, `failed`
- `payments.status`: `pending`, `succeeded`, `failed`, `expired`, `refunded`, `partially_refunded`, `disputed`, `won_dispute`, `lost_dispute`, `duplicate_settlement`

## Webhook Failure Semantics

- On processing error, webhook route marks event `failed` with stage-prefixed message:
  - format: `[processing_stage] normalized_error_message`
- Endpoint responds `400` for signature/payload/processing failures.
- Duplicate/claimed-by-other cases respond `200` with `{ duplicate: true }` payload.

## Operational Notes

- Keep Stripe CLI forwarding to `/api/stripe/webhook` in local test loops.
- Cron endpoint `/api/cron/stripe-reconcile` requires `x-cron-secret`.
- Reconcile lookback currently uses a 5-minute threshold and scans oldest pending first.

## Current Gaps / Future Extensions

- Archive-extension payment type is not finalized in this implementation path yet.
- Dispute/refund policy side effects (e.g., automatic session deactivation or account restrictions) are not fully codified.
- Monitoring/alerts for reconcile failures should be added for production hardening.
