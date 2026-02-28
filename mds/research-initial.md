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
- Log in quickly (magic link/OTP).
- Enter session camera screen with limited controls.
- Choose filter only if host enabled preset choice.
- Tap capture -> photo is auto-uploaded immediately.
- Shot counter decreases; when roll is finished, capture is locked.

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
- Payment gating (session activates only after successful payment webhook).
- QR code join flow.
- Guest auth + session entry.
- Camera capture and immediate upload flow.
- Host gallery for session photos.
- 30-day retention automation with deletion job.

## Suggested Architecture (MVP)

- Frontend: Next.js web app (mobile-first camera UX).
- Backend: Next.js API routes/server actions or lightweight service layer.
- Database: Supabase Postgres (hosts, sessions, guest-session enrollment, photos, payments).
- Auth: NextAuth v5 with Google OAuth for hosts; guest auth via magic link/OTP (to minimize event-friction).
- Object storage (MVP): Supabase Storage on Pro plan.
- Storage access pattern: provider-agnostic `StorageService` interface so underlying object store can be swapped later (Supabase <-> S3) without changing business logic.
- Payments: Stripe Checkout (one-time payment per session).
- Jobs: scheduled cleanup for expired photos and expired sessions.

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

- Background jobs/queue: **Trigger.dev**.
  - Purpose in SnapItNow:
    - retry failed uploads,
    - process Stripe webhook side effects safely,
    - run 30-day cleanup jobs,
    - run async image tasks (thumbnail/compression).
- Rate limiting: **manual baseline first** (no managed dependency required for MVP).
  - Approach: Next.js middleware + simple per-IP and per-session throttling on critical endpoints.
  - Scope now: join session, capture/upload, auth endpoints.
  - Advanced bot protection remains optional and can be added later only if abuse appears.
- Monitoring: **Sentry** (errors + traces).
- Product analytics: **PostHog** (funnel and device-level behavior).
- Image processing: **sharp** (compression, metadata stripping, optional thumbnails).
- API contract layer: **tRPC + Zod + TanStack Query**.
- Testing: **Vitest + Testing Library + Playwright** (mobile-focused end-to-end scenarios).

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
- `checkout_session_id`, `amount`, `currency`
- `status`, `paid_at`

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
2. **Paid session activation**
   - Stripe Checkout + webhook activation
3. **Guest flow**
   - QR join, password gate, camera capture, auto-upload, roll limits
   - add baseline manual rate limiting on join/capture/auth routes
4. **Host gallery + retention**
   - browse/download photos, 30-day expiry automation
5. **Hardening**
   - monitoring depth, retries, advanced anti-abuse controls, UX polish

## Immediate Next Decisions

- Confirm guest auth method for MVP (`magic link` vs `OTP code`).
- Confirm whether guests can view only their own photos or all session photos.
- Confirm default filter preset list for MVP.
- Define first version of `StorageService` interface and adapter contract.
- Define baseline rate-limit policy matrix (limits per route/window for join, capture, auth).
