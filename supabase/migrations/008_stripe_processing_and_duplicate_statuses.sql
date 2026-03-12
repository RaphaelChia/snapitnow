alter table if exists stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status_check,
  add constraint stripe_webhook_events_status_check
    check (status in ('processing', 'processed', 'ignored', 'failed'));

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
        'lost_dispute',
        'duplicate_settlement'
      )
    );
