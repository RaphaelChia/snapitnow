-- Hosts (synced from NextAuth on first login)
create table if not exists hosts (
  id         text primary key,
  email      text not null unique,
  name       text not null,
  image      text,
  created_at timestamptz not null default now()
);

-- Sessions
create table if not exists sessions (
  id              uuid primary key default gen_random_uuid(),
  host_id         text not null references hosts(id) on delete cascade,
  title           text not null,
  password_hash   text,
  filter_mode     text not null default 'fixed' check (filter_mode in ('fixed', 'preset')),
  fixed_filter    text,
  allowed_filters jsonb,
  roll_preset     int not null default 12 check (roll_preset in (8, 12, 24, 36)),
  status          text not null default 'draft' check (status in ('draft', 'active', 'expired')),
  activated_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_sessions_host_id on sessions(host_id);
create index idx_sessions_status  on sessions(status);

-- Guest sessions (enrollment + roll tracking)
create table if not exists guest_sessions (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id) on delete cascade,
  guest_user_id   text not null,
  shots_taken     int not null default 0,
  shots_remaining int not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (session_id, guest_user_id)
);

create index idx_guest_sessions_session on guest_sessions(session_id);

-- Photos
create table if not exists photos (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references sessions(id) on delete cascade,
  host_id              text not null references hosts(id),
  guest_user_id        text not null,
  object_key           text not null,
  filter_used          text,
  capture_committed_at timestamptz not null default now(),
  uploaded_at          timestamptz,
  status               text not null default 'pending_upload' check (status in ('pending_upload', 'uploaded', 'failed')),
  delete_after         timestamptz not null default (now() + interval '30 days')
);

create index idx_photos_session    on photos(session_id);
create index idx_photos_delete     on photos(delete_after);

-- Payments
create table if not exists payments (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references sessions(id) on delete cascade,
  host_id              text not null references hosts(id),
  provider             text not null default 'stripe',
  checkout_session_id  text,
  amount               int not null,
  currency             text not null default 'usd',
  status               text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);

create index idx_payments_session on payments(session_id);
