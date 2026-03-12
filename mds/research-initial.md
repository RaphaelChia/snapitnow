# SnapItNow - Research & Build Plan (MVP)

## Product Direction

SnapItNow is a browser-based, film-inspired photo session app:

- Guests scan a QR code, log in, and enter a live session.
- They take photos with a "film roll" constraint (limited shots).
- No second try: once capture happens, photo is immediately uploaded.
- Hosts create and configure sessions, then pay one-time per session.
- Photos stay available for 30 days, then are automatically deleted.

## Core Experience

### Guest POV

- Scan QR code from event signage/tablet.
- Log in quickly (magic link or Google OAuth — guest chooses).
- Enter session camera screen with limited controls.
- Choose filter only if host enabled preset choice.
- Tap capture -> photo is auto-uploaded immediately.
- Shot counter decreases; when roll is finished, capture is locked.
- After using at least half the roll, guest unlocks the session gallery to view all photos.

### Host/Organizer POV

- Create session.
- Configure:
  - session password (optional),
  - filter mode:
    - fixed single filter, or
    - guest-choose from preset list,
  - roll size preset (shots per guest).
- Pay one-time to activate session.
- Share QR code and monitor uploads in host gallery.

## Clarified Rule: "No Second Try"

- After user taps capture, app commits that shot.
- The app uploads immediately; no discard/retake path.
- If upload fails, system retries automatically in background.
- Guest still loses that shot to preserve film-camera behavior.

Implementation notes:

- Use atomic flow: `capture -> store temp blob -> create photo record -> upload -> finalize`.
- Prevent duplicate submission with idempotency key per capture event.
- Lock capture button during in-flight upload to avoid double taps.

## Guest Photo Gallery Access

Guests can view all session photos **only after using at least half their roll**.

- Purpose: encourage every guest to actively participate before browsing others' shots.
- Example: on a 12-shot roll, the guest must take at least 6 photos before the gallery unlocks.
- Before the threshold, the guest sees only their own photos (if any UI is provided) or a prompt to keep shooting.
- After unlock, the guest can browse all session photos (from all guests).
- The threshold check uses `shots_taken >= ceil(roll_preset / 2)` from the `guest_sessions` row.

## Roll Presets (Host Controls)

Host selects one preset per session for shots per guest:

- `8` shots
- `12` shots
- `24` shots
- `36` shots

Per-guest shot tracking:

- Each guest gets their own roll counter within that session.
- Counter cannot be reset by guest.
- Host reset is optional for support/admin only (not default in MVP).

## MVP Feature Set

- Session creation and config (password optional, filter mode, roll preset).
- Payment gating (session activates only after verified server-side Stripe completion path).
- QR code join flow.
- Guest auth + session entry.
- Camera capture and immediate upload flow.
- Host gallery for session photos.
- 30-day retention automation with deletion job.

## Suggested Architecture (MVP)

- Frontend: Next.js web app (mobile-first camera UX).
- Backend: Next.js API routes/server actions or lightweight service layer.
- Database: Supabase Postgres (hosts, sessions, guest-session enrollment, photos, payments).
- Auth: NextAuth v5 with Google OAuth for hosts; guest auth via **magic link** (primary, one less step than OTP — enter email, tap link, done) with **Google OAuth as an optional alternative** for guests who prefer it.
- Object storage (MVP): Supabase Storage on Pro plan.
- Storage access pattern: provider-agnostic `StorageService` interface so underlying object store can be swapped later (Supabase <-> S3) without changing business logic.
- Payments: Stripe Checkout (one-time payment per session).
- Jobs: cron-triggered API routes for scheduled cleanup of expired photos and sessions. Filter processing runs via Next.js `after()` (no external job system).

### Mobile-First UX Requirements

- Design and QA for mobile viewport first (camera, upload, retry, host quick actions).
- Prioritize iOS Safari and Chrome on Android behavior before desktop polish.
- Use large touch targets, safe-area insets, and clear permission/error recovery states.
- Keep capture flow single-focus and low-latency for unstable event networks.

### Storage Provider Decision (MVP -> Future)

- **MVP decision**: Use Supabase Pro + Supabase Storage for faster shipping and lower setup overhead.
- **Future option**: Migrate to S3 if egress/cost profile or platform requirements justify it.
- **Abstraction boundary**:
  - App code depends only on `StorageService` methods:
    - `createUploadTarget()`
    - `finalizeUpload()`
    - `getSignedReadUrl()`
    - `deleteObject()`
  - Store provider-neutral metadata in DB (`storage_provider`, `bucket`, `object_key`, `mime_type`, `bytes`).
  - Keep provider-specific SDK usage isolated inside adapter modules (`supabase-storage-adapter`, `s3-storage-adapter`).
- **Migration readiness**:
  - Avoid hard-coding public object URLs in DB.
  - Always resolve access through signed URL methods.
  - Support dual-read window during migration (`read from S3 if migrated else Supabase`).

## Supporting Stack Decisions (MVP)

- Background processing: **Next.js `after()` API** (built into Next.js 15+).
  - Runs server-side work after the HTTP response is sent — no external service needed.
  - Purpose in SnapItNow:
    - apply filter + generate thumbnail after raw photo upload,
    - async image tasks (compression, EXIF stripping).
  - For scheduled work (30-day cleanup, retry failed uploads): use a cron-triggered API route (Vercel Cron or equivalent).
  - For Stripe webhooks: handle synchronously in a standard API route.
- Rate limiting: **manual baseline first** (no managed dependency required for MVP).
  - Approach: Next.js middleware + simple per-IP and per-session throttling on critical endpoints.
  - Scope now: join session, capture/upload, auth endpoints.
  - Advanced bot protection remains optional and can be added later only if abuse appears.
- Monitoring: **Sentry** (errors + traces).
- Product analytics: **PostHog** (funnel and device-level behavior).
- Image processing: **sharp** (compression, metadata stripping, optional thumbnails).
- API contract layer: **tRPC + Zod + TanStack Query**.
- Testing: **Vitest + Testing Library + Playwright** (mobile-focused end-to-end scenarios).

## Data Access Pattern

All Supabase calls happen server-side. Client components interact through TanStack Query hooks that call Server Actions.

### Directory structure

```
lib/
  db/
    index.ts              ← Supabase server client factory
    queries/
      sessions.ts         ← read functions (getSessionById, listHostSessions, ...)
      photos.ts           ← read functions (getSessionPhotos, ...)
      payments.ts         ← read functions
    mutations/
      sessions.ts         ← write functions (createSession, activateSession, ...)
      photos.ts           ← write functions (commitPhoto, deleteExpiredPhotos, ...)
      payments.ts         ← write functions (recordPayment, ...)

hooks/
  use-sessions.ts         ← useQuery + useMutation wrappers for sessions
  use-photos.ts           ← useQuery + useMutation wrappers for photos
  use-payments.ts         ← useQuery + useMutation wrappers for payments

app/(main)/sessions/
  actions.ts              ← Server Actions (Zod-validated, calls lib/db)
```

### Principles

- Every file in `lib/db/` uses `import "server-only"` to prevent client bundling.
- Plain async functions, not classes. Each query/mutation takes explicit arguments and returns typed data.
- Components never touch the Supabase client directly.
- All reads use TanStack Query (`useQuery`) calling Server Actions as query functions.
- All writes use TanStack Query (`useMutation`) calling Server Actions that validate with Zod then call mutation functions.
- Server Actions are the bridge between client hooks and the DB layer.
- Query keys are centralized per domain for consistent cache invalidation.

### Data flow

```
Client Component
  → useQuery / useMutation (TanStack Query hook)
    → calls Server Action (app/.../actions.ts)
      → Zod validates input (mutations)
      → calls lib/db/queries/*.ts or lib/db/mutations/*.ts
        → Supabase server client
          → returns typed result
    → TanStack Query manages cache, loading, error, refetch
```

## Data Model (Initial)

### `hosts`

- `id`, `email`, `name`, `created_at`

### `sessions`

- `id`, `host_id`, `title`
- `password_hash` (nullable)
- `filter_mode` (`fixed` | `preset`)
- `fixed_filter` (nullable)
- `allowed_filters` (array/json, nullable)
- `roll_preset` (8/12/24/36)
- `status` (`draft` | `active` | `expired`)
- `activated_at`, `expires_at`, `created_at`

### `guest_sessions`

- `id`, `session_id`, `guest_user_id`
- `shots_taken`, `shots_remaining`
- `created_at`, `updated_at`
- unique constraint: (`session_id`, `guest_user_id`)

### `photos`

- `id`, `session_id`, `host_id`, `guest_user_id`
- `object_key`, `filter_used`
- `capture_committed_at`, `uploaded_at`
- `status` (`pending_upload` | `uploaded` | `failed`)
- `delete_after` (capture time + 30 days)

### `payments`

- `id`, `session_id`, `host_id`, `provider` (`stripe`)
- `checkout_session_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id`
- `stripe_charge_id`, `stripe_dispute_id`, `raw_event_snapshot`
- `amount`, `currency`
- `status`, `paid_at`, `refunded_at`, `disputed_at`, `dispute_closed_at`

Current status set in code/migrations:

- `pending`, `succeeded`, `failed`, `expired`
- `refunded`, `partially_refunded`
- `disputed`, `won_dispute`, `lost_dispute`
- `duplicate_settlement`

### `stripe_webhook_events`

- `stripe_event_id` (unique), `event_type`
- `status` (`processing` | `processed` | `ignored` | `failed`)
- `processed_at`, `error_message`

## Security and Privacy Baseline

- Private bucket by default; serve via signed URLs.
- Validate file type/size server-side before finalizing records.
- Session access checks on every API request.
- Baseline rate limiting is required early for critical endpoints:
  - join session,
  - capture/upload,
  - auth/login.
- Keep rate-limiting controls lightweight in MVP and expand only after end-to-end flow is stable.
- Publish privacy terms:
  - what data is collected,
  - 30-day retention and deletion,
  - host responsibility for attendee consent.

## Cost Strategy

- Cost drivers at MVP scale:
  - storage is small,
  - request volume + egress can matter more.
- Keep originals compressed to reasonable quality (no unnecessary full-res bloat).
- Add lifecycle rule: auto-delete objects after 30 days.
- Add daily job to remove stale DB metadata and failed uploads.
- Current pricing direction:
  - Start on Supabase Pro and use included quotas first.
  - Track storage egress monthly; if sustained overage grows, model migration to S3 + CDN later.

## Risks and Mitigations

- Mobile browser camera inconsistencies (especially iOS):
  - require explicit tap to start camera,
  - provide clear fallback messaging for denied permissions.
- Unstable event internet:
  - queue/retry uploads with exponential backoff,
  - show upload state so user knows shot is processing.
- Abuse/spam:
  - rate-limit join/capture endpoints,
  - short-lived signed upload URLs,
  - enforce session-level constraints server-side.

## Build Phases

1. **Foundation**
   - auth, host dashboard shell, session schema
   - mobile-first layout system (camera-first UX baseline)
2. **Guest flow (secure-first)**
   - keep session lifecycle status as the single gate (`draft` -> `active`) for guest access
   - add a host-only **dev-mode** activation control to toggle session status from `draft` to `active` for local/testing environments only
   - build guest entry route (`/s/:sessionId`) with social/magic-link auth and guest enrollment (`guest_sessions` upsert)
   - enforce server-side identity and session checks on join/capture/upload/photo URL endpoints (no trust in raw query params)
   - implement QR join, password gate, camera capture, auto-upload, roll limits
   - add baseline manual rate limiting on join/capture/auth routes
3. **Paid session activation**
   - Stripe Checkout + webhook integration
   - on successful payment webhook, finalize payment through DB RPC `finalize_activation_payment(...)`
   - DB function transitions `payments.status` and activates `sessions` (`draft` -> `active`) atomically for `one_time_session`
   - duplicate Stripe settlements are marked `duplicate_settlement` instead of silently mutating an already-succeeded flow
4. **Host gallery + retention**
   - browse/download photos, 30-day expiry automation
5. **Hardening**
   - monitoring depth, retries, advanced anti-abuse controls, UX polish

## Resolved Decisions

- **Guest auth method**: Magic link (primary) + Google OAuth (optional). Magic link is one fewer step than OTP — guest enters email, taps the link, done.
- **Guest photo visibility**: Guests can view all session photos after taking at least half their roll (`shots_taken >= ceil(roll_preset / 2)`). This incentivizes participation before browsing.
- **Default filter preset list**: `none`, `vintage`, `bw-classic`, `bw-high-contrast`, `cool-tone`, `warm-fade` (implemented in `lib/filters/presets.ts`).
- **StorageService interface**: Defined with `upload`, `download`, `getSignedUrl`, `delete`, `deleteMany` (implemented in `lib/storage/`).

## Remaining Decisions

- Define baseline rate-limit policy matrix (limits per route/window for join, capture, auth).

## Stripe Activation (Current Technical Shape)

The implementation now has three reliability layers:

1. **Checkout creation guard** in server action (`createActivationCheckout`) to avoid multiple active links.
2. **Webhook idempotency ledger** using `stripe_webhook_events` claim/finalize lifecycle.
3. **Reconcile cron** (`/api/cron/stripe-reconcile`) to process stale pending rows by pulling Stripe session truth.

### Crucial path snippet

```ts
// app/api/stripe/webhook/route.ts
const claimResult = await claimStripeWebhookEvent(event.id, event.type);
if (claimResult !== "claimed") {
  // Important: duplicate deliveries should return success to avoid infinite retries.
  return NextResponse.json({ ok: true, duplicate: true, state: claimResult });
}

await processCheckoutSessionCompleted({
  stripeCheckoutSessionId: session.id,
  stripePaymentIntentId:
    typeof session.payment_intent === "string" ? session.payment_intent : null,
  amount: session.amount_total,
  currency: session.currency,
  metadata: session.metadata,
  rawEventSnapshot,
});
```

Reasoning:

- Webhooks are at-least-once delivery; duplicate event handling is mandatory.
- Final payment state transitions are done server-side only after signature verification.
- Session activation is coupled to verified payment completion, not client redirect state.
