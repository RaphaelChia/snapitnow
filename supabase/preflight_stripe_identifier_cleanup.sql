-- Purpose:
-- 1) Preflight-check duplicate Stripe identifiers before applying
--    unique indexes from migration 015.
-- 2) Optional cleanup: keep the newest row per identifier and
--    null out duplicate identifier fields on older rows.
--
-- Usage:
-- - Run sections A and B first (read-only checks).
-- - If duplicates exist and you approve cleanup, run section C.
-- - After cleanup, rerun section A and then apply migration 015.

-- ============================================================
-- A) Read-only preflight duplicate report
-- ============================================================

-- payment intent duplicates
select
  'stripe_payment_intent_id' as identifier_type,
  stripe_payment_intent_id as identifier_value,
  count(*) as duplicate_count,
  array_agg(id order by created_at desc, id desc) as payment_ids
from payments
where provider = 'stripe'
  and stripe_payment_intent_id is not null
group by stripe_payment_intent_id
having count(*) > 1
order by duplicate_count desc, identifier_value;

-- charge duplicates
select
  'stripe_charge_id' as identifier_type,
  stripe_charge_id as identifier_value,
  count(*) as duplicate_count,
  array_agg(id order by created_at desc, id desc) as payment_ids
from payments
where provider = 'stripe'
  and stripe_charge_id is not null
group by stripe_charge_id
having count(*) > 1
order by duplicate_count desc, identifier_value;

-- dispute duplicates
select
  'stripe_dispute_id' as identifier_type,
  stripe_dispute_id as identifier_value,
  count(*) as duplicate_count,
  array_agg(id order by created_at desc, id desc) as payment_ids
from payments
where provider = 'stripe'
  and stripe_dispute_id is not null
group by stripe_dispute_id
having count(*) > 1
order by duplicate_count desc, identifier_value;

-- quick summary count by identifier type
with payment_intent_dupes as (
  select stripe_payment_intent_id
  from payments
  where provider = 'stripe' and stripe_payment_intent_id is not null
  group by stripe_payment_intent_id
  having count(*) > 1
),
charge_dupes as (
  select stripe_charge_id
  from payments
  where provider = 'stripe' and stripe_charge_id is not null
  group by stripe_charge_id
  having count(*) > 1
),
dispute_dupes as (
  select stripe_dispute_id
  from payments
  where provider = 'stripe' and stripe_dispute_id is not null
  group by stripe_dispute_id
  having count(*) > 1
)
select 'stripe_payment_intent_id' as identifier_type, count(*)::int as duplicate_keys from payment_intent_dupes
union all
select 'stripe_charge_id' as identifier_type, count(*)::int as duplicate_keys from charge_dupes
union all
select 'stripe_dispute_id' as identifier_type, count(*)::int as duplicate_keys from dispute_dupes;

-- ============================================================
-- B) Read-only winner/loser preview (what cleanup would do)
-- ============================================================

-- "winner" means newest row by created_at, then id.
with ranked as (
  select
    id,
    created_at,
    stripe_payment_intent_id,
    row_number() over (
      partition by stripe_payment_intent_id
      order by created_at desc, id desc
    ) as rn
  from payments
  where provider = 'stripe'
    and stripe_payment_intent_id is not null
)
select
  stripe_payment_intent_id as identifier_value,
  (array_agg(id order by rn) filter (where rn = 1))[1] as winner_payment_id,
  array_agg(id order by rn) filter (where rn > 1) as loser_payment_ids
from ranked
group by stripe_payment_intent_id
having count(*) > 1
order by stripe_payment_intent_id;

-- Repeat for charge/dispute if needed by swapping identifier column.

-- ============================================================
-- C) Optional cleanup (write operation)
-- ============================================================
-- IMPORTANT:
-- - This does NOT delete payment rows.
-- - It nulls duplicate identifiers on loser rows only.
-- - It stores before-image backup in payments_identifier_cleanup_backup.

begin;

-- Minimize races during cleanup.
lock table payments in share row exclusive mode;

create table if not exists payments_identifier_cleanup_backup (
  id bigserial primary key,
  backup_at timestamptz not null default now(),
  identifier_type text not null,
  identifier_value text not null,
  winner_payment_id uuid not null,
  loser_payment_id uuid not null,
  loser_payment_record jsonb not null
);

-- --- stripe_payment_intent_id cleanup ---
with ranked as (
  select
    id,
    stripe_payment_intent_id,
    row_number() over (
      partition by stripe_payment_intent_id
      order by created_at desc, id desc
    ) as rn,
    first_value(id) over (
      partition by stripe_payment_intent_id
      order by created_at desc, id desc
    ) as winner_id
  from payments
  where provider = 'stripe'
    and stripe_payment_intent_id is not null
),
losers as (
  select id, stripe_payment_intent_id, winner_id
  from ranked
  where rn > 1
)
insert into payments_identifier_cleanup_backup (
  identifier_type,
  identifier_value,
  winner_payment_id,
  loser_payment_id,
  loser_payment_record
)
select
  'stripe_payment_intent_id',
  l.stripe_payment_intent_id,
  l.winner_id,
  p.id,
  to_jsonb(p)
from losers l
join payments p on p.id = l.id;

with ranked as (
  select
    id,
    row_number() over (
      partition by stripe_payment_intent_id
      order by created_at desc, id desc
    ) as rn
  from payments
  where provider = 'stripe'
    and stripe_payment_intent_id is not null
),
losers as (
  select id
  from ranked
  where rn > 1
)
update payments p
set stripe_payment_intent_id = null
from losers
where p.id = losers.id;

-- --- stripe_charge_id cleanup ---
with ranked as (
  select
    id,
    stripe_charge_id,
    row_number() over (
      partition by stripe_charge_id
      order by created_at desc, id desc
    ) as rn,
    first_value(id) over (
      partition by stripe_charge_id
      order by created_at desc, id desc
    ) as winner_id
  from payments
  where provider = 'stripe'
    and stripe_charge_id is not null
),
losers as (
  select id, stripe_charge_id, winner_id
  from ranked
  where rn > 1
)
insert into payments_identifier_cleanup_backup (
  identifier_type,
  identifier_value,
  winner_payment_id,
  loser_payment_id,
  loser_payment_record
)
select
  'stripe_charge_id',
  l.stripe_charge_id,
  l.winner_id,
  p.id,
  to_jsonb(p)
from losers l
join payments p on p.id = l.id;

with ranked as (
  select
    id,
    row_number() over (
      partition by stripe_charge_id
      order by created_at desc, id desc
    ) as rn
  from payments
  where provider = 'stripe'
    and stripe_charge_id is not null
),
losers as (
  select id
  from ranked
  where rn > 1
)
update payments p
set stripe_charge_id = null
from losers
where p.id = losers.id;

-- --- stripe_dispute_id cleanup ---
with ranked as (
  select
    id,
    stripe_dispute_id,
    row_number() over (
      partition by stripe_dispute_id
      order by created_at desc, id desc
    ) as rn,
    first_value(id) over (
      partition by stripe_dispute_id
      order by created_at desc, id desc
    ) as winner_id
  from payments
  where provider = 'stripe'
    and stripe_dispute_id is not null
),
losers as (
  select id, stripe_dispute_id, winner_id
  from ranked
  where rn > 1
)
insert into payments_identifier_cleanup_backup (
  identifier_type,
  identifier_value,
  winner_payment_id,
  loser_payment_id,
  loser_payment_record
)
select
  'stripe_dispute_id',
  l.stripe_dispute_id,
  l.winner_id,
  p.id,
  to_jsonb(p)
from losers l
join payments p on p.id = l.id;

with ranked as (
  select
    id,
    row_number() over (
      partition by stripe_dispute_id
      order by created_at desc, id desc
    ) as rn
  from payments
  where provider = 'stripe'
    and stripe_dispute_id is not null
),
losers as (
  select id
  from ranked
  where rn > 1
)
update payments p
set stripe_dispute_id = null
from losers
where p.id = losers.id;

commit;

-- Post-cleanup verification (should return zero rows for each)
-- Re-run section A queries.
