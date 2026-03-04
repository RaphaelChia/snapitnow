alter table if exists hosts
add column if not exists last_login_at timestamptz not null default now();
