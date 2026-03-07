# Stripe Payment Research

## Scope

This document captures product and technical decisions for Stripe integration across:

- One-time payment to activate a session
- Optional paid archive extension after included storage window

## Confirmed Pricing Direction (v1)

- No recurring subscription in v1.
- Session includes standard 30-day retention.
- Hosts can purchase archive extension in one-off 3-month blocks.
- Keep pricing language simple and consumer-friendly.

### Session activation pricing (one-time)

- 8 rolls: S$59
- 12 rolls: S$65
- 24 rolls: S$72
- 36 rolls: S$79

### Archive extension pricing (one-off, non-recurring)

- Primary unit: 1,000 photos for 3 months.
- Preferred bundle checkout (to reduce Stripe fixed-fee impact):
  - Small: S$6 for up to 3,000 photos / 3 months
  - Medium: S$10 for up to 6,000 photos / 3 months
  - Large: S$14 for up to 10,000 photos / 3 months
- Message in UI: "No auto-renew. Buy again only if needed."

## Stripe Fee Feasibility

Assumed Stripe Singapore online card pricing:

- 3.4% + S$0.50 per successful domestic card transaction

Source: [Stripe SG pricing](https://stripe.com/en-sg/pricing)

### Why S$2 single-item checkouts are weak

- At S$2: fee = S$0.568, net = S$1.432, fee share = 28.4%.
- Conclusion: avoid tiny single-item transactions where possible.

### Net after Stripe (bundle model)

- Small S$6: fee S$0.704, net S$5.296
- Medium S$10: fee S$0.840, net S$9.160
- Large S$14: fee S$0.976, net S$13.024

## Supabase Cost Baseline (Current Stack)

Assumed plan baseline:

- Pro plan: US$25/month
- Storage quota: 100 GB included, then US$0.021 per GB
- Egress quota: 250 GB included, then US$0.09 per GB

Sources:

- [Supabase billing overview](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase monthly invoice guide](https://supabase.com/docs/guides/platform/your-monthly-invoice)

### Cost sanity check for 1,000 archived photos

Assume average 4 MB per photo (combined retained objects and derivatives).

- 1,000 photos -> ~4 GB stored
- 3 months storage cost: 4 * 3 * 0.021 = US$0.252
- If gallery/download traffic equals 1x full set over period: ~4 GB egress -> US$0.36
- Total variable infra estimate: US$0.612 per 1,000 photos / 3 months (before fixed plan cost)

Notes:

- If repeated downloads are much higher than 1x, egress dominates quickly.
- Stripe and Supabase bill in different currencies in many setups; FX can reduce margin.

## Singapore Demand Feasibility Model

Assumptions:

- 60 weddings/day in Singapore
- 10% app adoption -> 6 paid sessions/day
- ~180 paid sessions/month

### One-time session revenue estimate

- Equal mix of roll tiers average gross price = (59 + 65 + 72 + 79) / 4 = S$68.75
- Stripe fee at S$68.75 = S$2.8375
- Net per session after Stripe = S$65.9125
- Monthly net from session activations = 180 * 65.9125 = S$11,864.25

### Supabase variable cost sensitivity (30-day active storage)

Assume 4 MB/photo and 1x monthly egress of stored photo volume.

- Low volume: 1,000 photos/session -> 180,000 photos/month
  - Storage footprint ~720 GB
  - Storage overage: (720 - 100) * 0.021 = US$13.02
  - Egress overage: (720 - 250) * 0.09 = US$42.30
  - Plus base plan US$25 -> total ~US$80.32/month
- Medium volume: 2,000 photos/session -> 360,000 photos/month
  - Total ~US$160.24/month
- High volume: 3,000 photos/session -> 540,000 photos/month
  - Total ~US$240.16/month

Interpretation:

- At projected adoption, infrastructure cost remains small versus one-time session revenue.
- Main margin risk is not raw storage size; it is heavy egress/download behavior.

## Implementation Recommendations

- Launch with one-time session pricing + one-off archive bundles only.
- Enforce minimum checkout amount for archive purchases (bundle model already does this).
- Track per-session metrics from day one:
  - photos count
  - average bytes per photo
  - storage GB-month
  - egress GB
- Revisit archive pricing after first 1-2 months of real usage data.

## Outstanding Decisions

- Does 3-month extension start immediately on purchase or after the default 30 days end?
- At extension expiry, is there a short grace period before deletion?
- For 2,400 photos, do we strictly require 3 x 1,000-photo blocks (round up)?
- Do we include tax inside displayed price or add at checkout?

## Egress Rules Cheat Sheet (Supabase)

- A file read from Storage counts as egress out to client (public URL, signed URL, SDK download).
- Repeated views/downloads of the same file count repeatedly.
- CDN cache hits still count, but under cached egress pricing/quota.
- Uploading files is not egress, but increases storage size billing.
- Signed URL generation itself is tiny; actual image bytes transferred is the cost driver.
- Egress is unified across services (Storage, Database, Auth, Functions, Realtime), so large API payloads also contribute.

## Egress Optimization Plan (Current Stack)

- Keep gallery grids on thumbnails only (already implemented via `thumbnailUrl ?? signedUrl` fallback path).
- Open full-resolution file only on explicit user intent (tap/click), not in list views.
- Add strong cache-control headers on uploaded filtered/thumb assets to improve cache hit ratio.
- Reduce filtered output quality slightly if needed (for example, JPEG q85 -> q80).
- Cap filtered max long edge lower if needed (for example, 2048 -> 1600) for large cost drops.
- Prefer transformed/web-optimized delivery where applicable to reduce transfer bytes.

## Current Photo Size Model in This Codebase

Current controls found in app code:

- Capture source requests camera stream at ideal 1920x1080.
- Raw capture export: JPEG quality 0.92.
- Filtered output: max dimension 2048 (no enlargement), JPEG quality 85, mozjpeg enabled.
- Thumbnail output: max 400px, JPEG quality 75.

Control points (where to change behavior):

- `app/(guest)/s/[sessionId]/camera/camera-viewfinder.tsx`
  - `getUserMedia` ideal width/height
  - `canvas.toBlob(..., "image/jpeg", 0.92)`
- `lib/filters/process-photo.ts`
  - `.resize(2048, 2048, { fit: "inside", withoutEnlargement: true })`
  - `.jpeg({ quality: 85, mozjpeg: true })`
  - thumbnail `.resize(400, 400, ...)` + `.jpeg({ quality: 75 })`

Expected rough size ranges per photo (real-world estimate):

- Raw upload (1920x1080, JPEG q92): ~400 KB to 1.6 MB
- Filtered image (<=2048, JPEG q85): ~250 KB to 1.2 MB
- Thumbnail (<=400, JPEG q75): ~20 KB to 90 KB
- Combined stored bytes/photo (raw + filtered + thumb): ~0.67 MB to 2.89 MB

Important note:

- Exact size varies heavily by scene complexity, lighting/noise, and device camera output.
- To get true numbers for pricing control, log and persist `bytes` for raw/filtered/thumb at upload/processing time, then compute p50/p90.

## Stripe Webhook Event Mapping (Exact)

### Required webhook endpoint setup

- Endpoint URL: `/api/stripe/webhook`
- Verify every event with `STRIPE_WEBHOOK_SECRET` (signature check must pass before any DB write).
- Persist every processed Stripe event ID for idempotency (`event.id` unique).

### Event -> DB update mapping

- `checkout.session.completed`
  - Find/create payment row by `checkout_session_id`
  - Set:
    - `status = succeeded`
    - `paid_at = now()`
    - `stripe_checkout_session_id = event.data.object.id`
    - `stripe_payment_intent_id = event.data.object.payment_intent`
    - `payment_type = one_time_session | archive_extension`
  - If `payment_type = one_time_session`: activate target session (`draft -> active`)
  - If `payment_type = archive_extension`: extend archive entitlement window for host/session

- `checkout.session.expired`
  - Set payment `status = failed` (or `expired` if using richer status enum)
  - Do not activate session or extend archive

- `payment_intent.payment_failed`
  - Set payment `status = failed`
  - Store failure reason text in metadata column if present

- `charge.refunded`
  - Map by `stripe_charge_id` (or via payment_intent relation)
  - Set:
    - `status = refunded` for full refund, `partially_refunded` for partial
    - `refunded_amount = charge.amount_refunded`
    - `refunded_at = now()`
  - Apply product policy:
    - session payment refunded pre-use -> deactivate if allowed by policy
    - archive payment refunded -> rollback archive extension if policy allows

- `charge.dispute.created`
  - Set:
    - `status = disputed`
    - `stripe_dispute_id = dispute.id`
    - `disputed_at = now()`
    - `dispute_reason = dispute.reason`
    - `dispute_amount = dispute.amount`
  - Optional risk action: temporarily block new paid activations for host until resolved

- `charge.dispute.closed`
  - If won: `status = won_dispute`
  - If lost: `status = lost_dispute`
  - Set `dispute_closed_at = now()`
  - Apply final risk policy (for example, keep account restricted on repeated lost disputes)

### Safety rules (non-negotiable)

- Webhook handler must be idempotent (ignore already-processed `event.id`).
- Never trust client redirect/success page to activate session.
- Activation/entitlement writes must happen only after verified webhook event.
- Keep all Stripe IDs on payment rows for reliable reconciliation.

## Payment DB Entities Checklist (Current vs Required)

### Already present in project

- `payments` table exists with:
  - `session_id`, `host_id`, `provider`, `checkout_session_id`, `amount`, `currency`, `status`, `paid_at`
- `sessions` table lifecycle supports activation (`draft`, `active`, `expired`)

### Required additions for robust Stripe integration

- Extend `payments` table with:
  - `payment_type` (`one_time_session`, `archive_extension`)
  - `stripe_checkout_session_id` (can replace existing `checkout_session_id` naming)
  - `stripe_payment_intent_id`
  - `stripe_charge_id`
  - `stripe_dispute_id`
  - `refunded_amount`
  - `refunded_at`
  - `disputed_at`
  - `dispute_closed_at`
  - `dispute_reason`
  - `dispute_amount`
  - `raw_event_snapshot` (jsonb, optional)

- Add `stripe_webhook_events` table:
  - `id` (uuid)
  - `stripe_event_id` (unique)
  - `event_type`
  - `received_at`
  - `processed_at`
  - `status` (`processed`, `ignored`, `failed`)
  - `error_message` (nullable)

- Add archive entitlement table (recommended):
  - `archive_entitlements`
    - `id`
    - `host_id`
    - `session_id` (nullable if host-level)
    - `photos_quota` (for bundle math)
    - `valid_from`
    - `valid_until`
    - `source_payment_id` (FK to `payments`)
    - `status`

### Useful indexes

- `payments(stripe_checkout_session_id)` unique where not null
- `payments(stripe_payment_intent_id)`
- `payments(stripe_charge_id)`
- `payments(host_id, created_at desc)`
- `stripe_webhook_events(stripe_event_id)` unique
- `archive_entitlements(host_id, valid_until desc)`

### Reconciliation job (recommended)

- Daily job:
  - fetch last 24-72h Stripe events/payments
  - compare against local `payments` + `stripe_webhook_events`
  - heal missed updates (for example missed webhook delivery)
  - emit alert when mismatch found

## Implementation Coverage Summary

- One-time activation payment: covered by `payments` + `sessions.activate` path.
- Archive extension payment: requires entitlement tracking entity (recommended above).
- Refund and dispute handling: requires additional payment status fields + webhook event ledger.
- Operational resilience: requires idempotent webhook processing + daily reconciliation.
