alter table if exists payments
  add column if not exists checkout_intent jsonb;

-- Backfill current pending activation rows so intent-aware reuse can
-- make deterministic decisions immediately after deploy.
update payments p
set checkout_intent = jsonb_build_object(
  'roll_preset', s.roll_preset,
  'baseCents', p.amount,
  'discountCents', 0,
  'finalCents', p.amount,
  'currency', lower(p.currency)
)
from sessions s
where p.session_id = s.id
  and p.payment_type = 'one_time_session'
  and p.status = 'pending'
  and p.checkout_intent is null;
