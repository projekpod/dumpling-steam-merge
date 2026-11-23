create function pg_temp.check_that(condition boolean) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'assertion_failed'; end if; end;
$$;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004');
select pg_temp.check_that((select count(*) from public.profiles) = 4);
select pg_temp.check_that((select count(*) from pg_tables where schemaname = 'public' and rowsecurity) = 16);
select pg_temp.check_that((select value = 'false' from public.feature_flags where name = 'CASHOUT_ENABLED'));
select pg_temp.check_that(not public.mochi_ads_enabled('admob') and not public.mochi_ads_enabled('offerwall'));

do $$
declare
  one uuid := '00000000-0000-4000-8000-000000000001';
  two uuid := '00000000-0000-4000-8000-000000000002';
  three uuid := '00000000-0000-4000-8000-000000000003';
  four uuid := '00000000-0000-4000-8000-000000000004';
  r1 uuid := '10000000-0000-4000-8000-000000000001';
  r2 uuid := '10000000-0000-4000-8000-000000000002';
  r3 uuid := '10000000-0000-4000-8000-000000000003';
  d1 text := repeat('a', 64);
  d2 text := repeat('b', 64);
  day date := public.mochi_period('daily', statement_timestamp());
  code text;
  result jsonb;
  ticket uuid;
  redemption uuid;
  balance numeric;
begin
  perform pg_temp.check_that(public.mochi_register_device(one, d1, null, null));
  perform pg_temp.check_that(public.mochi_register_device(two, d1, null, null));
  perform pg_temp.check_that(not public.mochi_register_device(three, d1, null, null));
  perform pg_temp.check_that((select review_required from public.profiles where id = three));
  perform pg_temp.check_that(public.mochi_register_device(three, d2, null, null));
  perform pg_temp.check_that(public.mochi_register_device(four, repeat('c',64), null, null));

  perform pg_temp.check_that(public.mochi_take_limit(three, 'test', 1, 60));
  for attempt in 1..3 loop
    perform pg_temp.check_that(not public.mochi_take_limit(three, 'test', 1, 60));
  end loop;
  perform pg_temp.check_that(exists (select 1 from public.risk_flags where user_id = three and reason = 'rate:test'));

  begin
    perform public.mochi_save_sync(one, r1, 0, 1e12, '{}', '[]', d1);
    raise exception 'unearned coins were accepted';
  exception when sqlstate 'PT422' then
    perform pg_temp.check_that(sqlerrm = 'coin_gain_exceeds_bound');
  end;
  result := public.mochi_save_sync(one, r1, 0, 0, '{"verified_level":12}', '[{"type":"spawn","to":0}]', d1);
  perform pg_temp.check_that(result->>'revision' = '1' and result->>'verified_level' = '1');
  result := public.mochi_save_sync(one, r1, 0, 0, '{}', '[]', d1);
  perform pg_temp.check_that(result->>'duplicate' = 'true' and result->>'revision' = '1');
  begin
    perform public.mochi_save_sync(one, r2, 0, 0, '{}', '[]', d1);
    raise exception 'stale revision was accepted';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.mochi_save_sync(one, r2, 1, 0, '{}', '[{"type":"move","from":4,"to":5}]', d1);
    raise exception 'invalid move was accepted';
  exception when sqlstate 'PT422' then null;
  end;
  begin
    perform public.mochi_save_sync(one, r2, 1, 0, '{}', '[{"type":"spawn","to":1}]', d1);
    raise exception 'spawn exceeded budget';
  exception when sqlstate 'PT422' then
    perform pg_temp.check_that(sqlerrm = 'spawn_budget_exceeded');
  end;
  begin
    perform public.mochi_save_sync(one, r2, 1, 0, '{}', '[{"type":"release","to":0}]', d1);
    raise exception 'released mochi when board was not blocked';
  exception when sqlstate 'PT422' then null;
  end;
  update public.cloud_saves set synced_at = synced_at - interval '10 seconds' where user_id = one;
  result := public.mochi_save_sync(one, r2, 1, 6, '{}',
    '[{"type":"spawn","to":1},{"type":"move","from":0,"to":1}]', d1);
  perform pg_temp.check_that(result->>'verified_level' = '2' and result->>'revision' = '2');

  begin
    perform public.mochi_leaderboard(one, 'weekly', 12999);
    raise exception 'forged score was accepted';
  exception when sqlstate 'PT422' then null;
  end;
  result := public.mochi_leaderboard(one, 'weekly', 2001);
  perform pg_temp.check_that(result->'me'->>'rank' = '1' and result->'top'->0->>'score' = '2001');
  perform pg_temp.check_that(public.mochi_leaderboard(one, 'all_time', 2001)->>'verified_score' = '2001');
  perform pg_temp.check_that(public.mochi_leaderboard(three, 'weekly')->'me' = 'null');

  perform pg_temp.check_that((select progress from public.mission_progress
    where user_id = one and mission_id = 'daily-merge' and period_start = day) = 1);
  begin
    perform public.mochi_claim_mission(one, 'daily-merge', day);
    raise exception 'unfinished mission was credited';
  exception when sqlstate 'PT422' then null;
  end;
  begin
    perform public.mochi_claim_mission(one, 'daily-merge', day - 1);
    raise exception 'expired mission was credited';
  exception when sqlstate 'PT422' then null;
  end;
  update public.mission_progress set progress = 5 where user_id = one and mission_id = 'daily-merge';
  perform pg_temp.check_that(public.mochi_claim_mission(one, 'daily-merge', day)->>'status' = 'credited');
  perform pg_temp.check_that(public.mochi_claim_mission(one, 'daily-merge', day)->>'status' = 'duplicate');
  perform pg_temp.check_that(public.mochi_wallet(one) = 8);

  code := public.mochi_referral_code(one)->>'code';
  begin
    perform public.mochi_apply_referral(one, code);
    raise exception 'self-referral was accepted';
  exception when sqlstate 'PT422' then null;
  end;
  perform pg_temp.check_that(public.mochi_apply_referral(two, code)->>'status' = 'blocked');
  perform pg_temp.check_that(public.mochi_apply_referral(three, code)->>'status' = 'pending');
  perform pg_temp.check_that(public.mochi_referral_status(three)->>'status' = 'pending');
  begin
    perform public.mochi_apply_referral(one, public.mochi_referral_code(three)->>'code');
    raise exception 'referral cycle was accepted';
  exception when sqlstate 'PT422' then null;
  end;
  -- Controlled fixtures represent elapsed verified days; production clients cannot write these.
  update public.referrals set created_at = created_at - interval '3 days' where invitee_id = three;
  insert into public.cloud_saves (user_id, peak_level) values (three, 7);
  insert into public.verified_activity (user_id, active_day, spawns) values
    (three, day - 2, 1), (three, day - 1, 1);
  update public.cloud_saves set peak_level = 8 where user_id = three;
  perform pg_temp.check_that(public.mochi_referral_status(three)->>'status' = 'pending');
  insert into public.verified_activity (user_id, active_day, spawns) values (three, day, 1);
  update public.cloud_saves set peak_level = 7 where user_id = three;
  perform pg_temp.check_that(public.mochi_referral_status(three)->>'status' = 'pending');
  update public.cloud_saves set peak_level = 8 where user_id = three;
  perform pg_temp.check_that(public.mochi_referral_status(three)->>'status' = 'credited');
  perform pg_temp.check_that(public.mochi_referral_status(three)->>'status' = 'credited');
  perform pg_temp.check_that(public.mochi_wallet(one) = 58);
  perform pg_temp.check_that(public.mochi_apply_referral(four, code)->>'status' = 'pending');
  perform pg_temp.check_that(public.mochi_register_device(one, repeat('c',64), null, null));
  perform pg_temp.check_that(public.mochi_referral_status(four)->>'status' = 'blocked');

  begin
    perform public.mochi_ad_ticket(one, d1);
    raise exception 'AdMob enabled by default';
  exception when sqlstate 'PT403' then null;
  end;
  update public.feature_flags set value = '"admob"' where name = 'ADS_MODE';
  ticket := (public.mochi_ad_ticket(one, d1)->>'custom_data')::uuid;
  begin
    perform public.mochi_credit_admob(two, ticket, 'aaa', statement_timestamp());
    raise exception 'ticket was usable by another account';
  exception when sqlstate 'PT422' then null;
  end;
  perform pg_temp.check_that(public.mochi_credit_admob(one, ticket, 'aaa', statement_timestamp())->>'status' = 'credited');
  perform pg_temp.check_that(public.mochi_credit_admob(one, ticket, 'aaa', statement_timestamp())->>'status' = 'duplicate');
  begin
    perform public.mochi_credit_admob(one, ticket, 'bbb', statement_timestamp());
    raise exception 'same ticket was used again';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.mochi_credit_provider(one, 'offerwall', 'offer-1', 30);
    raise exception 'inactive offerwall was credited';
  exception when sqlstate 'PT403' then null;
  end;
  update public.feature_flags set value = '"offerwall"' where name = 'ADS_MODE';
  perform pg_temp.check_that(public.mochi_credit_provider(one, 'offerwall', 'offer-1', 30)->>'status' = 'credited');
  perform pg_temp.check_that(public.mochi_credit_provider(one, 'offerwall', 'offer-1', 30)->>'status' = 'duplicate');
  begin
    perform public.mochi_credit_provider(three, 'offerwall', 'offer-1', 30);
    raise exception 'same transaction moved to another user';
  exception when sqlstate 'PT409' then null;
  end;
  for payment in 2..10 loop
    perform pg_temp.check_that(public.mochi_credit_provider(one, 'offerwall', 'offer-' || payment, 30)->>'status' = 'credited');
  end loop;
  perform pg_temp.check_that(public.mochi_credit_provider(one, 'offerwall', 'offer-11', 30)->>'status' = 'rate_limited');

  begin
    perform public.mochi_redeem(one, r3, 20);
    raise exception 'cashout enabled by default';
  exception when sqlstate 'PT403' then null;
  end;
  update public.feature_flags set value = 'true' where name = 'CASHOUT_ENABLED';
  begin
    perform public.mochi_redeem(four, r3, 20);
    raise exception 'empty wallet was debited';
  exception when sqlstate 'PT422' then null;
  end;
  balance := public.mochi_wallet(one);
  redemption := (public.mochi_redeem(one, r3, 20)->>'id')::uuid;
  perform pg_temp.check_that(public.mochi_wallet(one) = balance - 20);
  perform pg_temp.check_that(public.mochi_redeem(one, r3, 20)->>'duplicate' = 'true');
  perform pg_temp.check_that(public.mochi_review_redemption(redemption, 'rejected', 'operator-1')->>'status' = 'rejected');
  perform pg_temp.check_that(public.mochi_review_redemption(redemption, 'rejected', 'operator-1')->>'duplicate' = 'true');
  perform pg_temp.check_that(public.mochi_wallet(one) = balance);
  redemption := (public.mochi_redeem(one, gen_random_uuid(), 20)->>'id')::uuid;
  perform pg_temp.check_that(public.mochi_review_redemption(redemption, 'approved', 'operator-1')->>'status' = 'approved');
  perform pg_temp.check_that(public.mochi_wallet(one) = balance - 20);

  begin
    update public.wallet_ledger set points = points + 1 where user_id = one;
    raise exception 'ledger was mutable';
  exception when raise_exception then
    perform pg_temp.check_that(sqlerrm = 'wallet_ledger_is_append_only');
  end;
end;
$$;

-- More than 100 verified score rows in a controlled fixture exercise rank beyond the returned slice.
with players as (
  insert into auth.users (id) select gen_random_uuid() from generate_series(1, 100) returning id
)
insert into public.leaderboard_scores (user_id, scope, period_start, score)
select id, 'weekly', public.mochi_period('weekly', statement_timestamp()), 3002 from players;

select pg_temp.check_that(jsonb_array_length(public.mochi_leaderboard(
  '00000000-0000-4000-8000-000000000001', 'weekly')->'top') = 100);
select pg_temp.check_that(public.mochi_leaderboard(
  '00000000-0000-4000-8000-000000000001', 'weekly')->'me'->>'rank' = '101');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002', false);
set role authenticated;
select pg_temp.check_that((select count(*) from public.profiles) = 1);
select pg_temp.check_that((select count(*) from public.wallet_ledger) = 0);
select pg_temp.check_that((select count(user_id) from public.devices) = 1);
select pg_temp.check_that((select count(*) from public.leaderboard_scores) = 0);
do $$ begin
  begin
    perform device_hash from public.devices;
    raise exception 'raw signal access was granted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.mochi_credit_provider('00000000-0000-4000-8000-000000000002','offerwall','forged',20);
    raise exception 'authenticated RPC write was granted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set review_required = false;
    raise exception 'client was allowed to write a profile';
  exception when insufficient_privilege then null;
  end;
end; $$;
reset role;

set role anon;
do $$ begin
  begin
    perform id from public.profiles;
    raise exception 'anonymous access was granted';
  exception when insufficient_privilege then null;
  end;
end; $$;
reset role;
