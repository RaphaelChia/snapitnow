create table if not exists guest_identities (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists guest_auth_challenges (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  email       text not null,
  otp_hash    text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_guest_auth_challenges_lookup
  on guest_auth_challenges(session_id, email, consumed_at);

create index if not exists idx_guest_auth_challenges_expires
  on guest_auth_challenges(expires_at);
