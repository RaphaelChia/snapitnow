create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  host_id text not null references hosts(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by text references hosts(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by text references hosts(id) on delete set null,
  revoked_at timestamptz,
  notes text
);

create unique index if not exists idx_admin_users_active_host_unique
  on admin_users (host_id)
  where status = 'active';

create index if not exists idx_admin_users_status_granted_at
  on admin_users (status, granted_at desc);

alter table if exists sessions
  drop constraint if exists sessions_ended_by_check,
  add constraint sessions_ended_by_check
    check (ended_by is null or ended_by in ('host', 'auto', 'admin'));

alter table if exists sessions
  drop constraint if exists sessions_end_reason_check,
  add constraint sessions_end_reason_check
    check (
      end_reason is null
      or end_reason in ('manual', 'wedding_cutoff', 'admin_force_expire')
    );

create index if not exists idx_sessions_status_created_at
  on sessions (status, created_at desc);

create index if not exists idx_payments_status_created_at
  on payments (status, created_at desc);
