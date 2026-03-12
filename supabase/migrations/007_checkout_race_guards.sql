-- Race safety invariant:
-- one "pending" and one "succeeded" payment max per (session_id, payment_type).
-- This is scoped by payment_type so future reasons (for example archive_extension)
-- can coexist for the same session without cross-interference.

-- Resolve duplicate pending rows before adding unique index.
with ranked_pending as (
  select
    id,
    row_number() over (
      partition by session_id, payment_type
      order by created_at desc, id desc
    ) as rn
  from payments
  where status = 'pending'
)
update payments
set status = 'expired'
where id in (
  select id
  from ranked_pending
  where rn > 1
);

-- Resolve duplicate succeeded rows before adding unique index.
-- Keep the earliest successful settlement as authoritative.
with ranked_succeeded as (
  select
    id,
    row_number() over (
      partition by session_id, payment_type
      order by coalesce(paid_at, created_at) asc, id asc
    ) as rn
  from payments
  where status = 'succeeded'
)
update payments
set status = 'failed'
where id in (
  select id
  from ranked_succeeded
  where rn > 1
);

create unique index if not exists idx_payments_one_pending_per_reason
  on payments(session_id, payment_type)
  where status = 'pending';

create unique index if not exists idx_payments_one_succeeded_per_reason
  on payments(session_id, payment_type)
  where status = 'succeeded';
