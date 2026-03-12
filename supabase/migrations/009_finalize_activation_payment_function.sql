create or replace function finalize_activation_payment(
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_amount int,
  p_currency text,
  p_payment_type text,
  p_session_id uuid,
  p_host_id text,
  p_raw_event_snapshot jsonb
)
returns text
language plpgsql
as $$
declare
  v_payment payments%rowtype;
begin
  select *
  into v_payment
  from payments
  where stripe_checkout_session_id = p_checkout_session_id
  for update;

  if not found then
    raise exception 'No pending payment found for checkout session %', p_checkout_session_id;
  end if;

  if v_payment.host_id <> p_host_id then
    raise exception 'Checkout metadata host does not match payment host';
  end if;

  if v_payment.session_id <> p_session_id then
    raise exception 'Checkout metadata session does not match payment session';
  end if;

  if v_payment.payment_type <> p_payment_type then
    raise exception 'Checkout metadata payment_type does not match payment record';
  end if;

  if v_payment.status <> 'pending' then
    return 'noop';
  end if;

  if exists (
    select 1
    from payments p
    where p.session_id = v_payment.session_id
      and p.payment_type = v_payment.payment_type
      and p.status = 'succeeded'
      and p.id <> v_payment.id
  ) then
    update payments
    set
      status = 'duplicate_settlement',
      stripe_checkout_session_id = p_checkout_session_id,
      stripe_payment_intent_id = p_payment_intent_id,
      amount = p_amount,
      currency = p_currency,
      raw_event_snapshot = p_raw_event_snapshot
    where id = v_payment.id
      and status = 'pending';

    return 'duplicate_settlement';
  end if;

  update payments
  set
    status = 'succeeded',
    paid_at = now(),
    stripe_checkout_session_id = p_checkout_session_id,
    stripe_payment_intent_id = p_payment_intent_id,
    amount = p_amount,
    currency = p_currency,
    raw_event_snapshot = p_raw_event_snapshot
  where id = v_payment.id
    and status = 'pending';

  if p_payment_type = 'one_time_session' then
    update sessions
    set
      status = 'active',
      activated_at = coalesce(activated_at, now())
    where id = p_session_id
      and host_id = p_host_id
      and status = 'draft';
  end if;

  return 'succeeded';
end;
$$;
