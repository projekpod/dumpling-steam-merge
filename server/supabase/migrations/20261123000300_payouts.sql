create function public.mochi_wallet(p_user uuid) returns numeric
language sql stable set search_path = '' as $$
  select coalesce(sum(points), 0) from public.wallet_ledger where user_id = p_user;
$$;

create function public.mochi_referral_code(p_user uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_code text;
begin
  select referral_code into strict v_code from public.profiles where id = p_user for update;
  if v_code is null then
    loop
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 17, 16));
      begin
        update public.profiles set referral_code = v_code where id = p_user;
        exit;
      exception when unique_violation then
        -- Retry a collision without changing the existing code.
      end;
    end loop;
  end if;
  return jsonb_build_object('code', v_code);
end;
$$;

create function public.mochi_apply_referral(p_user uuid, p_code text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_inviter uuid;
  v_existing public.referrals%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('mochi:referral-links', 0));
  select id into v_inviter from public.profiles where referral_code = p_code;
  if not found then
    raise sqlstate 'PT404' using message = 'referral_code_not_found';
  end if;
  if v_inviter = p_user then
    raise sqlstate 'PT422' using message = 'self_referral';
  end if;
  select * into v_existing from public.referrals where invitee_id = p_user;
  if found then
    if v_existing.inviter_id <> v_inviter then
      raise sqlstate 'PT409' using message = 'referral_already_linked';
    end if;
    return jsonb_build_object('status', 'duplicate');
  end if;
  if exists (
    with recursive chain(id) as (
      select v_inviter
      union
      select r.inviter_id from public.referrals r join chain c on r.invitee_id = c.id
    )
    select 1 from chain where id = p_user
  ) then
    raise sqlstate 'PT422' using message = 'referral_cycle';
  end if;
  if not exists (select 1 from public.devices where user_id = v_inviter)
    or not exists (select 1 from public.devices where user_id = p_user) then
    raise sqlstate 'PT422' using message = 'referral_needs_devices';
  end if;
  if exists (
    select 1 from public.devices a join public.devices b using (device_hash)
    where a.user_id = p_user and b.user_id = v_inviter
  ) then
    perform public.mochi_flag(p_user, 'referral_shared_device');
    return jsonb_build_object('status', 'blocked', 'reason', 'referral_shared_device');
  end if;
  insert into public.referrals (inviter_id, invitee_id) values (v_inviter, p_user);
  return jsonb_build_object('status', 'pending');
end;
$$;

create function public.mochi_referral_status(p_user uuid) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_link public.referrals%rowtype;
  v_days integer;
  v_level integer;
  v_status text := 'unlinked';
begin
  select * into v_link from public.referrals where invitee_id = p_user for update;
  if found then
    -- Device registration takes the same per-player advisory lock.
    perform pg_advisory_xact_lock(hashtextextended(least(p_user, v_link.inviter_id)::text, 21));
    perform pg_advisory_xact_lock(hashtextextended(greatest(p_user, v_link.inviter_id)::text, 21));
    select count(*) into v_days from public.verified_activity
    where user_id = p_user and active_day >= public.mochi_period('daily', v_link.created_at);
    select coalesce((select peak_level from public.cloud_saves where user_id = p_user), 0) into v_level;

    if v_link.rewarded_at is not null then
      v_status := 'credited';
    elsif exists (
      select 1 from public.devices a join public.devices b using (device_hash)
      where a.user_id = p_user and b.user_id = v_link.inviter_id
    ) then
      perform public.mochi_flag(p_user, 'referral_shared_device');
      v_status := 'blocked';
    elsif v_days >= 3 and v_level >= 8 then
      perform 1 from public.profiles where id = v_link.inviter_id for update;
      insert into public.wallet_ledger (user_id, source, event_key, points)
      values (v_link.inviter_id, 'referral', v_link.id::text, 50)
      on conflict (source, event_key) do nothing;
      update public.referrals set rewarded_at = statement_timestamp() where id = v_link.id;
      v_status := 'credited';
    else
      v_status := 'pending';
    end if;
  end if;
  return jsonb_build_object('status', v_status, 'active_days', coalesce(v_days, 0),
    'verified_level', coalesce(v_level, 0), 'invitees', (
      select count(*) from public.referrals where inviter_id = p_user
    ));
end;
$$;

create function public.mochi_ads_enabled(p_mode text) returns boolean
language sql stable set search_path = '' as $$
  select coalesce((
    select value = to_jsonb(p_mode) from public.feature_flags where name = 'ADS_MODE'
  ), false);
$$;

create function public.mochi_ad_ticket(p_user uuid, p_device text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_ticket public.reward_tickets%rowtype;
begin
  if not public.mochi_ads_enabled('admob') then
    raise sqlstate 'PT403' using message = 'admob_disabled';
  end if;
  if not exists (select 1 from public.devices where user_id = p_user and device_hash = p_device) then
    raise sqlstate 'PT403' using message = 'device_not_registered';
  end if;
  insert into public.reward_tickets (user_id) values (p_user) returning * into v_ticket;
  return jsonb_build_object('custom_data', v_ticket.id, 'user_id', p_user, 'expires_at', v_ticket.expires_at);
end;
$$;

create function public.mochi_credit_provider(p_user uuid, p_source text, p_event text, p_points integer) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_existing public.wallet_ledger%rowtype;
begin
  if p_source not in ('admob', 'offerwall') or p_event is null or char_length(p_event) not between 1 and 128
    or p_points is null or p_points not between 1 and 1000000 then
    raise sqlstate 'PT400' using message = 'invalid_reward';
  end if;
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    raise sqlstate 'PT404' using message = 'player_not_found';
  end if;

  select * into v_existing from public.wallet_ledger where source = p_source and event_key = p_event;
  if found then
    if v_existing.user_id <> p_user or v_existing.points <> p_points then
      raise sqlstate 'PT409' using message = 'transaction_conflict';
    end if;
    return jsonb_build_object('status', 'duplicate', 'points', v_existing.points);
  end if;
  if not public.mochi_ads_enabled(p_source) then
    raise sqlstate 'PT403' using message = 'reward_source_disabled';
  end if;
  if (select count(*) from public.wallet_ledger where user_id = p_user and source = p_source
      and created_at >= statement_timestamp() - interval '1 hour') >= 10 then
    perform public.mochi_flag(p_user, 'provider_reward_rate');
    return jsonb_build_object('status', 'rate_limited');
  end if;

  insert into public.wallet_ledger (user_id, source, event_key, points)
  values (p_user, p_source, p_event, p_points)
  on conflict (source, event_key) do nothing returning * into v_existing;
  if not found then
    select * into strict v_existing from public.wallet_ledger where source = p_source and event_key = p_event;
    if v_existing.user_id <> p_user or v_existing.points <> p_points then
      raise sqlstate 'PT409' using message = 'transaction_conflict';
    end if;
    return jsonb_build_object('status', 'duplicate', 'points', v_existing.points);
  end if;
  return jsonb_build_object('status', 'credited', 'points', p_points);
end;
$$;

create function public.mochi_credit_admob(p_user uuid, p_ticket uuid, p_event text, p_occurred timestamptz)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_ticket public.reward_tickets%rowtype;
  v_result jsonb;
begin
  select * into v_ticket from public.reward_tickets where id = p_ticket for update;
  if not found or v_ticket.user_id <> p_user or p_occurred is null
    or p_occurred < v_ticket.created_at - interval '2 minutes' or p_occurred > v_ticket.expires_at then
    raise sqlstate 'PT422' using message = 'invalid_reward_ticket';
  end if;
  if v_ticket.transaction_id is not null then
    if v_ticket.transaction_id <> p_event then
      raise sqlstate 'PT409' using message = 'reward_ticket_used';
    end if;
    return jsonb_build_object('status', 'duplicate', 'points', 10);
  end if;
  v_result := public.mochi_credit_provider(p_user, 'admob', p_event, 10);
  if v_result->>'status' = 'credited' then
    update public.reward_tickets set transaction_id = p_event where id = p_ticket;
  elsif v_result->>'status' = 'duplicate' then
    raise sqlstate 'PT409' using message = 'transaction_ticket_mismatch';
  end if;
  return v_result;
end;
$$;

create function public.mochi_redeem(p_user uuid, p_request uuid, p_points integer) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_redemption public.redemptions%rowtype;
begin
  if p_request is null or p_points is null or p_points not between 1 and 1000000000 then
    raise sqlstate 'PT400' using message = 'invalid_redemption';
  end if;
  perform 1 from public.profiles where id = p_user for update;
  select * into v_redemption from public.redemptions where user_id = p_user and request_id = p_request;
  if found then
    if v_redemption.points <> p_points then
      raise sqlstate 'PT409' using message = 'redemption_request_conflict';
    end if;
    return jsonb_build_object('id', v_redemption.id, 'status', v_redemption.status, 'duplicate', true);
  end if;
  if not coalesce((select value = 'true'::jsonb from public.feature_flags where name = 'CASHOUT_ENABLED'), false) then
    raise sqlstate 'PT403' using message = 'cashout_disabled';
  end if;
  if not exists (select 1 from public.devices where user_id = p_user) then
    raise sqlstate 'PT403' using message = 'device_not_registered';
  end if;
  if exists (select 1 from public.redemptions where user_id = p_user and status = 'pending') then
    raise sqlstate 'PT409' using message = 'redemption_already_pending';
  end if;
  if public.mochi_wallet(p_user) < p_points then
    raise sqlstate 'PT422' using message = 'insufficient_points';
  end if;
  insert into public.redemptions (user_id, request_id, points)
  values (p_user, p_request, p_points) returning * into v_redemption;
  insert into public.wallet_ledger (user_id, source, event_key, points)
  values (p_user, 'redemption_hold', v_redemption.id::text, -p_points);
  return jsonb_build_object('id', v_redemption.id, 'status', 'pending', 'duplicate', false);
end;
$$;

create function public.mochi_review_redemption(p_id uuid, p_decision text, p_reviewer text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_redemption public.redemptions%rowtype;
begin
  if p_decision is null or p_decision not in ('approved', 'rejected') or
    p_reviewer is null or btrim(p_reviewer) = '' or char_length(p_reviewer) > 80 then
    raise sqlstate 'PT400' using message = 'invalid_review';
  end if;
  select * into v_redemption from public.redemptions where id = p_id;
  if not found then
    raise sqlstate 'PT404' using message = 'redemption_not_found';
  end if;
  perform 1 from public.profiles where id = v_redemption.user_id for update;
  select * into strict v_redemption from public.redemptions where id = p_id for update;
  if v_redemption.status <> 'pending' then
    if v_redemption.status <> p_decision then
      raise sqlstate 'PT409' using message = 'redemption_already_reviewed';
    end if;
    return jsonb_build_object('id', p_id, 'status', p_decision, 'duplicate', true);
  end if;
  if p_decision = 'approved'
    and not coalesce((select value = 'true'::jsonb from public.feature_flags where name = 'CASHOUT_ENABLED'), false) then
    raise sqlstate 'PT403' using message = 'cashout_disabled';
  end if;
  if p_decision = 'rejected' then
    insert into public.wallet_ledger (user_id, source, event_key, points)
    values (v_redemption.user_id, 'redemption_refund', p_id::text, v_redemption.points);
  end if;
  update public.redemptions set status = p_decision, reviewed_at = statement_timestamp(), reviewer_ref = p_reviewer
  where id = p_id;
  return jsonb_build_object('id', p_id, 'status', p_decision, 'duplicate', false);
end;
$$;

do $$
declare
  f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and starts_with(p.proname, 'mochi_')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
