alter table if exists sessions
  add column if not exists wedding_date_local date,
  add column if not exists event_timezone text,
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by text,
  add column if not exists end_reason text,
  add column if not exists wedding_date_update_count int not null default 0;

alter table if exists sessions
  drop constraint if exists sessions_ended_by_check,
  add constraint sessions_ended_by_check
    check (ended_by is null or ended_by in ('host', 'auto'));

alter table if exists sessions
  drop constraint if exists sessions_end_reason_check,
  add constraint sessions_end_reason_check
    check (end_reason is null or end_reason in ('manual', 'wedding_cutoff'));

create index if not exists idx_sessions_active_with_schedule
  on sessions (wedding_date_local, event_timezone)
  where status = 'active'
    and wedding_date_local is not null
    and event_timezone is not null;

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  event_type text not null,
  actor_type text not null,
  actor_id text,
  occurred_at timestamptz not null default now(),
  request_id text,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_events_entity_timeline
  on audit_events (entity_type, entity_id, occurred_at desc);

create index if not exists idx_audit_events_event_type
  on audit_events (event_type, occurred_at desc);

create index if not exists idx_audit_events_actor_timeline
  on audit_events (actor_type, actor_id, occurred_at desc);

create or replace function prevent_audit_events_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

drop trigger if exists audit_events_no_update on audit_events;
create trigger audit_events_no_update
before update on audit_events
for each row
execute function prevent_audit_events_mutation();

drop trigger if exists audit_events_no_delete on audit_events;
create trigger audit_events_no_delete
before delete on audit_events
for each row
execute function prevent_audit_events_mutation();
