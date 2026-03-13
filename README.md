This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Architecture Notes

### Session Lifecycle Source of Truth

- Runtime session state is `sessions.status` (`draft` | `active` | `expired`).
- Schedule metadata (`wedding_date_local`, `event_timezone`) determines auto-end eligibility, not runtime access by itself.
- Session end metadata (`ended_at`, `ended_by`, `end_reason`) is stored on the `sessions` row for fast product reads.

### Audit Events (Strong Default)

Use the shared `audit_events` table for all audit trails across domains (sessions, payments, photos, guest flows, cron, webhooks). Do not add feature-specific audit tables unless there is a strict compliance requirement.

Recommended event shape:

- `entity_type`: domain name (`session`, `payment`, `photo`, etc.)
- `entity_id`: primary object identifier
- `event_type`: namespaced action (`session.ended.manual`, `payment.refund.issued`)
- `actor_type`: `host` | `guest` | `system` | `cron` | `webhook`
- `actor_id`: nullable actor identifier
- `occurred_at`: immutable event timestamp
- `request_id`: request trace id (optional)
- `correlation_id`: workflow/job correlation id (optional)
- `metadata`: schema-versioned JSON payload for event-specific fields

Implementation defaults:

- Append-only table: updates/deletes are blocked.
- Write actor snapshot values into `metadata.actorSnapshot` so timelines render without N+1 lookups.
- Keep read-time enrichment optional for "latest profile" views.

Query/index defaults:

- Entity timeline: `(entity_type, entity_id, occurred_at desc)`
- Event analytics: `(event_type, occurred_at desc)`
- Actor timeline: `(actor_type, actor_id, occurred_at desc)`
