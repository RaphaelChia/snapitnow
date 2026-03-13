# Session Close Research and Plan

## Objective

Add a reliable session closing system with two triggers:

1. Host manually ends session from session detail page.
2. Cron auto-ends active sessions after wedding cutoff.

Single source of truth is always `sessions.status` (`draft` | `active` | `expired`).
Wedding date is scheduling metadata only, not runtime truth.

---

## Finalized Product Decisions

- Ending is permanent. No reopen.
- Wedding date is required at session creation.
- Wedding date is date-only.
- Auto-close rule: close uploads at end of `WeddingDate + 1 day`, 23:59:59.
- Auto-close only applies to `active` sessions. `draft` sessions are ignored.
- Manual close button appears only in session detail page.
- Manual close uses irreversible confirmation modal.
- On end:
  - camera/viewfinder/shutter are hidden,
  - guests see a graceful thank-you message naming session title,
  - OTP auth is still required,
  - gallery remains available for 30 days,
  - all authenticated guests can see all photos regardless of unlock threshold.
- Track end audit details (`ended_at`, `ended_by`) and reason/event reporting.

---

## Timezone Recommendation

Use event-local semantics, not pure UTC date semantics.

Recommended storage:

- `wedding_date_local` (date-only, host-selected)
- `event_timezone` (IANA zone, e.g. `Asia/Singapore`)

Reason:

- A wedding "date" is a local social date, not a UTC date.
- UTC-only date handling causes early/late close behavior around timezone boundaries.
- Cron logic should compute cutoff from source fields using one shared policy function.

---

## Do We Need `expires_at` (Derived Column)?

Short answer: for this product direction, no.

### Chosen direction

Cron can query active sessions and compute "is due" from `wedding_date_local` every run.
This is now the preferred approach.

### Why this fits future policy changes

- Changing policy (`+1 day` -> `+2 days` -> `+3 days`) is a one-place change.
- No backfill job required for active sessions.
- No stale derived timestamps to migrate.
- Fewer dependencies and lower cascading impact.

### Tradeoff (accepted)

- Cron does timezone/date computation at runtime.
- This is acceptable with hourly cadence and current scale.

Retention remains independent in photo-level `delete_after`.

---

## Proposed Data Model Changes

In `sessions`:

- `wedding_date_local` (date, required for new sessions)
- `event_timezone` (text, required; default from host/browser or app default)
- `ended_at` (timestamptz, nullable)
- `ended_by` (text/enum: `host` | `auto`, nullable)
- `end_reason` (text/enum: `manual` | `wedding_cutoff`, nullable)
- `wedding_date_update_count` (int, default 0)
- `wedding_date_locked` (bool, optional convenience; or derive from update_count >= 1)

Optional reporting table (preferred for audit history):

- `session_status_events`
  - `id`
  - `session_id`
  - `from_status`
  - `to_status`
  - `trigger` (`host_manual`, `cron_wedding_cutoff`)
  - `actor_host_id` nullable
  - `occurred_at`
  - `metadata` JSONB

---

## Session Transition Rules

### Manual End

- Allowed only when `status='active'`.
- Host ownership required.
- Transition:
  - `status -> expired`
  - `ended_at = now()`
  - `ended_by = 'host'`
  - `end_reason = 'manual'`
- Insert status event row.

### Auto End (cron)

- Query only active sessions, then compute due cutoff per session from:
  - `wedding_date_local`
  - `event_timezone`
  - current close policy (currently: local wedding day + 1 day at 23:59:59)
- Transition:
  - `status -> expired`
  - `ended_at = now()`
  - `ended_by = 'auto'`
  - `end_reason = 'wedding_cutoff'`
- Insert status event row.

### Guardrails

- Transition should be idempotent (`where status='active'` in update).
- Manual and cron races should produce one winner only.

---

## Wedding Date Editing Policy (Your "Change Once" Rule)

Current intended UX:

- Estimated date is mandatory on create.
- Host can update date once later to final date.
- After one update, no further changes.

Recommendation:

- Keep this rule for v1 (simple and abuse-resistant).
- Enforce in backend (`wedding_date_update_count < 1`).
- Show clear UI copy:
  - "You can update wedding date once after creation."
  - "Updates remaining: 1" / "Updates remaining: 0".
- Block setting date before current local date.

Alternative commonly used UX (future option):

- Unlimited edits until activation, then lock.

Given current product maturity, your one-time update policy is acceptable.

---

## UX Plan

### Create Session Dialog

- Add required wedding date input.
- Add helper copy about auto-close at end of next day.
- Validate no past dates.

### Session Detail Page

- Add "End session" destructive button only for active sessions.
- Add confirmation modal with irreversible warning.
- Add wedding date summary and auto-close info.
- On wedding day only, show informational banner:
  - uploads stop at next day 23:59,
  - gallery/images remain for 30 days.

### Guest Camera Page

- If session expired: replace camera UI with centered thank-you message.
- Example copy:
  - "Thank you for being part of {sessionTitle}'s celebration."
  - "Uploads are now closed."

### Guest Gallery Page

- For expired sessions, bypass unlock threshold and return full gallery to OTP-auth guests.

---

## Backend/API Plan

- Extend create session action validation schema with required wedding date + timezone.
- Add server action for manual end.
- Add server action for one-time wedding date update.
- Extend session query payload to include end metadata and scheduling fields.
- Add shared utility for policy evaluation (single place), used by cron and optional read-time guards.

---

## Cron Plan

Add endpoint similar to existing reconcile cron:

- `POST /api/cron/session-auto-end`
- Secured via existing `x-cron-secret`.
- Behavior:
  - read active sessions in batches,
  - compute close cutoff from date/timezone/policy,
  - end sessions where computed cutoff is <= now(),
  - mark expired with auto metadata,
  - insert status events,
  - return summary counters (`scanned`, `expired`, `failed`).
- Cadence: hourly (SLA within 1 hour).

### Correct selection predicate (inequality)

Use "wedding date is old enough", not "wedding date is newer than threshold".

- Expire condition should be equivalent to:
  - `wedding_date_local <= current_local_date - policy_days`
- For current policy (+1 day close window), use whole-day threshold logic in event timezone.
- Do not invert it as:
  - `current_local_date - policy_days < wedding_date_local`
  - that would select not-yet-due sessions.

---

## Reporting and Admin Readiness

Minimum:

- `ended_at`, `ended_by`, `end_reason` on session row.

Better:

- append-only `session_status_events` for full lifecycle traceability and analytics.

Suggested analytics events:

- `session_ended_manual`
- `session_ended_auto_wedding_cutoff`
- `wedding_date_updated_once`

---

## Why This Plan Fits Current Architecture

- Matches existing "status as source of truth" patterns.
- Aligns with existing cron and secure route patterns.
- Keeps business logic server-side with typed validation.
- Maintains clear separation:
  - schedule metadata (`wedding_date_local`, timezone)
  - runtime truth (`status`).

---

## Open Implementation Notes

- Decide whether to backfill existing sessions with nullable wedding fields or migration defaults.
- Decide default timezone for hosts who do not explicitly choose one.
- Confirm exact thank-you copy with product tone.

