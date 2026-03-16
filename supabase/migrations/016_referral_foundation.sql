alter table if exists hosts
  add column if not exists referred_by_host_id text references hosts(id) on delete set null,
  add column if not exists referred_at timestamptz,
  add column if not exists referral_source_code text;

create index if not exists idx_hosts_referred_by_host_id
  on hosts(referred_by_host_id);

create table if not exists referral_codes (
  id uuid primary key default gen_random_uuid(),
  host_id text not null unique references hosts(id) on delete cascade,
  code text not null unique,
  discount_percent int not null default 15 check (discount_percent >= 0 and discount_percent <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_referral_codes_active
  on referral_codes(active);
