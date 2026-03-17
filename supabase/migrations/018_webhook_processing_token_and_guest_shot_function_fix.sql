alter table if exists stripe_webhook_events
  add column if not exists processing_token uuid;

-- Backfill in-flight rows so lease fencing can be applied immediately.
update stripe_webhook_events
set processing_token = gen_random_uuid()
where status = 'processing'
  and processing_token is null;

create index if not exists idx_stripe_webhook_events_processing_token
  on stripe_webhook_events(processing_token)
  where processing_token is not null;

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
    update guest_sessions as gs
    set
      shots_taken = gs.shots_taken + 1,
      shots_remaining = gs.shots_remaining - 1,
      updated_at = now()
    where gs.id = p_guest_session_id
      and gs.shots_remaining > 0
    returning
      gs.id,
      gs.shots_taken,
      gs.shots_remaining;
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
    update guest_sessions as gs
    set
      shots_taken = greatest(gs.shots_taken - 1, 0),
      shots_remaining = gs.shots_remaining + 1,
      updated_at = now()
    where gs.id = p_guest_session_id
    returning
      gs.id,
      gs.shots_taken,
      gs.shots_remaining;
end;
$$;
