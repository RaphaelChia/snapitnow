# Admin Portal + Audit Foundation Plan

## Goal

Build an end-to-end admin portal aligned with current SnapItNow architecture, enabling:
- Admin control of session lifecycle (force end, force reactivate)
- Payments visibility (read-only)
- Audit trail visibility and expansion to all important domain actions

---

## What We Discussed (Decisions Finalized)

- **Admin model:** Go straight to **DB-backed** admin access (no env allowlist bootstrap).
- **Session controls:**
  - Admin can **force reactivate** expired sessions.
  - Admin can **force expire** draft sessions (and active sessions).
- **Payments in admin:** **Read-only** monitoring (no mutation actions in v1).
- **Admin navigation:** Show `Admin` entry in navbar for admins only.
- **Security requirement:** Admin paths/actions must be validated **both frontend and backend**.
- **Bootstrap strategy:** First admin will be created manually via SQL row insert by operator.

---

## Architecture Direction (Repo-Aligned)

### Prefer Server Actions for internal app writes

Use Server Actions for admin/app-originated writes (session state changes, audit appends).

**Why**
- Matches existing codebase pattern (`app/(main)/sessions/actions.ts`)
- Less complexity than introducing internal API routes
- Keeps auth + validation + mutation in one server boundary

### Keep route handlers only where technically needed

Continue using API routes only for:
- Stripe webhook ingestion
- Cron endpoints
- Guest/public auth issuance flows
- Multipart/binary requirements

This preserves current architecture and avoids transport sprawl.

---

## Admin Access Model

## Data model
- Add `admin_users` table:
  - `host_id` (FK to `hosts.id`)
  - `status` (`active`, `revoked`)
  - `role` (start with `admin`, extensible)
  - `granted_by`, `granted_at`, `revoked_by`, `revoked_at`
  - optional `notes`
- Suggested indexes:
  - active admin lookup by `host_id`
  - status/time index for admin list operations

## Backend guard (source of truth)
- Add `lib/auth/admin.ts`:
  - `isAdmin(hostId)`
  - `requireAdmin()` (throws/redirects unauthorized)
- Every admin page + admin action must call this.

## Frontend admin state
- Extend auth session token with `isAdmin` for UI branching only.
- Add NextAuth type augmentation for `session.user.isAdmin`.
- Navbar uses `session.user.isAdmin` to conditionally render admin link.

**Important:** frontend visibility is convenience; backend guard is enforcement.

---

## Admin Portal Scope (v1)

## Route structure
- `app/(main)/admin/page.tsx`
- `app/(main)/admin/sessions/page.tsx`
- `app/(main)/admin/payments/page.tsx`
- `app/(main)/admin/audit/page.tsx`

## Data hooks (TanStack Query)
- `hooks/use-admin-sessions.ts`
- `hooks/use-admin-payments.ts`
- `hooks/use-admin-audit.ts`

Use:
- `useQuery` for reads
- `useMutation` for writes
- query invalidation on successful mutation

---

## Session Admin Operations

## Required admin mutations
- `forceExpireSessionAsAdmin(sessionId, reason)`
  - Allowed from `draft` and `active`
  - Transition to `expired`
  - Set `ended_at`, `ended_by='admin'`, `end_reason='admin_force_expire'`
- `forceReactivateSessionAsAdmin(sessionId, reason)`
  - Allowed from `expired`
  - Transition to `active`
  - Set/refresh `activated_at`
  - Clear end metadata (`ended_at`, `ended_by`, `end_reason`) for coherent state

## Schema updates needed
- Extend `sessions_ended_by_check` to allow `admin`
- Extend `sessions_end_reason_check` with admin reason(s)

## UX controls
- Destructive confirmation modal for force-expire
- Guarded confirmation for reactivation
- Disabled states and clear mutation feedback

---

## Payments Admin (Read-Only)

## Capabilities
- Monitor payment lifecycle from existing tables:
  - `payments`
  - `stripe_webhook_events`
- No write/reconcile triggers from admin UI in v1

## Filters (beyond quick filter)
- `status`, `payment_type`
- host email
- session id/title
- Stripe checkout session id / payment intent id
- date range
- sortable + paginated table

## Drill-in detail
- Payment row details
- Related webhook events + error state for troubleshooting

---

## Audit Trail Strategy (Expanded)

Current state: audit events exist but are concentrated around session close/date updates.

### Requirement
Create a reusable audit foundation to log consistently across all domains.

### Reusable audit API
- Keep low-level `recordAuditEvent`
- Add domain-facing layer:
  - `lib/audit/index.ts` -> single `audit.log(...)`
  - `lib/audit/events.ts` -> typed event catalog
  - `lib/audit/domain/session.ts` -> convenience wrappers

### Event coverage to add now
- `session.created`
- `session.deleted`
- `session.activation.checkout_started` (attempting to pay)
- `session.activated.payment_succeeded` (session going live)
- `session.wedding_date.updated`
- existing end events
- admin force events:
  - `session.expired.admin_force`
  - `session.reactivated.admin_force`

### Why this structure
- Prevents ad-hoc event naming
- Keeps metadata shape consistent
- Makes auditing easy to reuse in future domains without repeating boilerplate

---

## Where To Wire Audit Immediately

In `app/(main)/sessions/actions.ts`:
- `createNewSession` -> log creation
- `removeSession` -> log deletion
- `createActivationCheckout` -> log checkout-attempt start
- payment success finalization path -> log session live event
- `updateWeddingDate` -> log update (already exists, migrate to wrapper)
- `endSessionManual` -> log end (already exists, migrate to wrapper)

In future `app/(main)/admin/actions.ts`:
- log all admin session overrides

---

## Query/Scale Notes

- Keep indexed filters aligned with admin usage:
  - sessions by status + recency
  - payments by status/host + recency
  - existing audit indexes already strong for entity/event/actor timelines
- Prefer cursor pagination for growth scenarios
- Keep business logic in `lib/...`; pages/actions remain transport adapters

---

## Security Rules (Non-Negotiable)

- Admin checks on **every** backend admin entrypoint.
- Frontend admin state used only for UX gating.
- Never allow frontend-only gating to authorize access.
- Continue strict Zod validation on action boundaries.

---

## Build Order (Recommended)

1. DB migration: `admin_users` + session end metadata constraints for admin reasons.
2. Admin auth guard: backend `requireAdmin()` + auth session `isAdmin`.
3. Admin route setup + navbar conditional rendering.
4. Admin session mutations (force expire/reactivate) + audit logging.
5. Admin payments read-only views + advanced filters.
6. Consolidated audit layer (typed events + wrappers) and migration of existing action logging.

---

## Final Clarifications Captured

- Internal app writes (including audit appends) should use **Server Actions**, not new API routes.
- API routes remain only for external/public or protocol-specific entrypoints (webhooks, cron, guest auth, multipart).

