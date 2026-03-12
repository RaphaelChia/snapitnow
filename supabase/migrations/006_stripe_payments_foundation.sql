alter table if exists payments
  add column if not exists payment_type text not null default 'one_time_session' check (payment_type in ('one_time_session', 'archive_extension')),
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_dispute_id text,
  add column if not exists refunded_amount int not null default 0,
  add column if not exists refunded_at timestamptz,
  add column if not exists disputed_at timestamptz,
  add column if not exists dispute_closed_at timestamptz,
  add column if not exists dispute_reason text,
  add column if not exists dispute_amount int,
  add column if not exists raw_event_snapshot jsonb;

alter table if exists payments
  drop constraint if exists payments_status_check,
  add constraint payments_status_check
    check (
      status in (
        'pending',
        'succeeded',
        'failed',
        'expired',
        'refunded',
        'partially_refunded',
        'disputed',
        'won_dispute',
        'lost_dispute'
      )
    );

create table if not exists stripe_webhook_events (
  id              uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type      text not null,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  status          text not null default 'processed' check (status in ('processed', 'ignored', 'failed')),
  error_message   text
);

create table if not exists archive_entitlements (
  id                uuid primary key default gen_random_uuid(),
  host_id           text not null references hosts(id) on delete cascade,
  session_id        uuid references sessions(id) on delete cascade,
  photos_quota      int not null check (photos_quota > 0),
  valid_from        timestamptz not null,
  valid_until       timestamptz not null,
  source_payment_id uuid not null references payments(id) on delete cascade,
  status            text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at        timestamptz not null default now()
);

create unique index if not exists idx_payments_stripe_checkout_session_id_unique
  on payments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists idx_payments_stripe_payment_intent_id
  on payments(stripe_payment_intent_id);

create index if not exists idx_payments_stripe_charge_id
  on payments(stripe_charge_id);

create index if not exists idx_payments_host_id_created_at
  on payments(host_id, created_at desc);

create unique index if not exists idx_stripe_webhook_events_event_id_unique
  on stripe_webhook_events(stripe_event_id);

create index if not exists idx_archive_entitlements_host_id_valid_until
  on archive_entitlements(host_id, valid_until desc);
