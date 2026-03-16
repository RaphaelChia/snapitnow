alter table if exists stripe_webhook_events
  add column if not exists processing_started_at timestamptz,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists attempt_count int not null default 0;

alter table if exists stripe_webhook_events
  drop constraint if exists stripe_webhook_events_attempt_count_non_negative,
  add constraint stripe_webhook_events_attempt_count_non_negative
    check (attempt_count >= 0);

create index if not exists idx_stripe_webhook_events_status_lease
  on stripe_webhook_events(status, lease_expires_at);

create unique index if not exists idx_payments_stripe_payment_intent_id_unique
  on payments(stripe_payment_intent_id)
  where provider = 'stripe' and stripe_payment_intent_id is not null;

create unique index if not exists idx_payments_stripe_charge_id_unique
  on payments(stripe_charge_id)
  where provider = 'stripe' and stripe_charge_id is not null;

create unique index if not exists idx_payments_stripe_dispute_id_unique
  on payments(stripe_dispute_id)
  where provider = 'stripe' and stripe_dispute_id is not null;

create or replace function reserve_guest_shot(
  p_guest_session_id uuid
)
returns table (
  id uuid,
  shots_taken int,
  shots_remaining int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update guest_sessions
    set
      shots_taken = shots_taken + 1,
      shots_remaining = shots_remaining - 1,
      updated_at = now()
    where guest_sessions.id = p_guest_session_id
      and shots_remaining > 0
    returning
      guest_sessions.id,
      guest_sessions.shots_taken,
      guest_sessions.shots_remaining;
end;
$$;

create or replace function release_guest_shot(
  p_guest_session_id uuid
)
returns table (
  id uuid,
  shots_taken int,
  shots_remaining int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update guest_sessions
    set
      shots_taken = greatest(shots_taken - 1, 0),
      shots_remaining = shots_remaining + 1,
      updated_at = now()
    where guest_sessions.id = p_guest_session_id
    returning
      guest_sessions.id,
      guest_sessions.shots_taken,
      guest_sessions.shots_remaining;
end;
$$;
