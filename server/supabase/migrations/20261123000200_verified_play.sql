create function public.mochi_flag(p_user uuid, p_reason text) returns void
language plpgsql set search_path = '' as $$
begin
  update public.profiles set review_required = true where id = p_user and not review_required;
  insert into public.risk_flags (user_id, reason) values (p_user, p_reason)
  on conflict (user_id, reason) do update
  set hits = least(public.risk_flags.hits::bigint + 1, 2147483647)::integer,
    last_seen_at = statement_timestamp();
end;
$$;

create function public.mochi_take_limit(p_user uuid, p_action text, p_max integer, p_window integer)
returns boolean language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_hits integer;
begin
  insert into public.action_limits (user_id, action, window_start, hits)
  values (p_user, p_action, v_now, 1)
  on conflict (user_id, action) do update
  set window_start = case when public.action_limits.window_start <= v_now - make_interval(secs => p_window)
      then v_now else public.action_limits.window_start end,
    hits = case when public.action_limits.window_start <= v_now - make_interval(secs => p_window)
      then 1 else least(public.action_limits.hits, p_max + 3) + 1 end
  returning hits into v_hits;
  if v_hits >= p_max + 3 then
    perform public.mochi_flag(p_user, 'rate:' || p_action);
  end if;
  return v_hits <= p_max;
end;
$$;

create function public.mochi_register_device(p_user uuid, p_device text, p_agent text, p_subnet text)
returns boolean language plpgsql set search_path = '' as $$
declare
  v_accounts integer;
begin
  -- Keep the accounts-per-device check atomic across simultaneous sign-ups.
  perform pg_advisory_xact_lock(hashtextextended(p_device, 20));
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 21));
  if exists (select 1 from public.devices where user_id = p_user and device_hash = p_device) then
    update public.devices set last_seen_at = statement_timestamp(),
      user_agent_hash = coalesce(p_agent, user_agent_hash), subnet_hash = coalesce(p_subnet, subnet_hash)
    where user_id = p_user and device_hash = p_device;
    return true;
  end if;
  select count(*) into v_accounts from public.devices where device_hash = p_device;
  if v_accounts >= 2 then
    perform public.mochi_flag(p_user, 'device_account_limit');
    return false;
  end if;
  if (select count(*) from public.devices where user_id = p_user) >= 5 then
    perform public.mochi_flag(p_user, 'device_rotation_limit');
    return false;
  end if;
  insert into public.devices (user_id, device_hash, user_agent_hash, subnet_hash)
  values (p_user, p_device, p_agent, p_subnet);
  if v_accounts > 0 then
    perform public.mochi_flag(p_user, 'shared_device');
  elsif p_agent is not null and p_subnet is not null and exists (
    select 1 from public.devices where user_id <> p_user
      and user_agent_hash = p_agent and subnet_hash = p_subnet
  ) then
    perform public.mochi_flag(p_user, 'shared_network_and_agent');
  end if;
  return true;
end;
$$;

create function public.mochi_period(p_cadence text, p_now timestamptz) returns date
language sql immutable set search_path = '' as $$
  select case
    when p_cadence = 'all_time' then date '1970-01-01'
    when p_cadence = 'daily' then (p_now at time zone 'UTC')::date
    else date_trunc('week', p_now at time zone 'UTC')::date
  end;
$$;

create function public.mochi_read_save(p_user uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce((
    select jsonb_build_object('revision', revision, 'coins', coins, 'save', payload,
      'verified_board', verified_board, 'verified_level', peak_level, 'synced_at', synced_at)
    from public.cloud_saves where user_id = p_user
  ), jsonb_build_object('revision', 0, 'coins', 0, 'save', '{}'::jsonb,
    'verified_board', array_fill(0, array[30]), 'verified_level', 0, 'synced_at', null));
$$;

create function public.mochi_save_sync(
  p_user uuid, p_request uuid, p_revision bigint, p_coins numeric, p_save jsonb, p_actions jsonb, p_device text
) returns jsonb language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_save public.cloud_saves%rowtype;
  v_board smallint[];
  v_peak integer;
  v_merge_peak integer := 0;
  v_spawns integer := 0;
  v_merges integer := 0;
  v_merge_coins bigint := 0;
  v_budget numeric;
  v_elapsed numeric;
  v_paid_seconds numeric;
  v_max_gain numeric;
  v_action jsonb;
  v_from integer;
  v_to integer;
  v_level integer;
  v_old_revision bigint;
begin
  if not exists (select 1 from public.devices where user_id = p_user and device_hash = p_device) then
    raise sqlstate 'PT403' using message = 'device_not_registered';
  end if;
  if p_revision is null or p_revision < 0 or p_request is null or
      p_coins is null or p_coins not between 0 and 9007199254740991 or
      jsonb_typeof(p_save) is distinct from 'object' or octet_length(p_save::text) > 49152 or
      jsonb_typeof(p_actions) is distinct from 'array' then
    raise sqlstate 'PT400' using message = 'invalid_save';
  end if;
  if jsonb_array_length(p_actions) > 128 then
    raise sqlstate 'PT400' using message = 'too_many_actions';
  end if;

  insert into public.cloud_saves (user_id, synced_at)
  select p_user, created_at from public.profiles where id = p_user on conflict do nothing;
  select * into strict v_save from public.cloud_saves where user_id = p_user for update;
  select revision into v_old_revision from public.cloud_sync_requests
    where user_id = p_user and request_id = p_request;
  if found then
    return public.mochi_read_save(p_user) || jsonb_build_object('duplicate', true, 'applied_revision', v_old_revision);
  end if;
  if p_revision <> v_save.revision then
    raise sqlstate 'PT409' using message = 'revision_conflict';
  end if;

  v_board := v_save.verified_board;
  v_peak := v_save.peak_level;
  v_elapsed := greatest(0, extract(epoch from v_now - v_save.synced_at));
  v_budget := least(32, v_save.spawn_budget + v_elapsed / 0.42);
  for v_action in select value from jsonb_array_elements(p_actions) loop
    if jsonb_typeof(v_action) <> 'object' or coalesce(v_action->>'to', '') !~ '^(0|[1-9]|[12][0-9])$' then
      raise sqlstate 'PT400' using message = 'invalid_action';
    end if;
    v_to := (v_action->>'to')::integer + 1;
    if v_action->>'type' = 'spawn' then
      if v_board[v_to] <> 0 then
        raise sqlstate 'PT422' using message = 'occupied_spawn';
      end if;
      if v_budget < 1 then
        raise sqlstate 'PT422' using message = 'spawn_budget_exceeded';
      end if;
      v_board[v_to] := 1;
      v_spawns := v_spawns + 1;
      v_peak := greatest(v_peak, 1);
      v_budget := v_budget - 1;
    elsif v_action->>'type' = 'move' then
      if coalesce(v_action->>'from', '') !~ '^(0|[1-9]|[12][0-9])$' then
        raise sqlstate 'PT400' using message = 'invalid_action';
      end if;
      v_from := (v_action->>'from')::integer + 1;
      v_level := v_board[v_from];
      if v_from = v_to or v_level = 0 or
        (v_board[v_to] <> 0 and (v_board[v_to] <> v_level or v_level = 12)) then
        raise sqlstate 'PT422' using message = 'invalid_merge_or_move';
      end if;
      if v_board[v_to] <> 0 then
        v_level := v_level + 1;
        v_merges := v_merges + 1;
        v_merge_peak := greatest(v_merge_peak, v_level);
        v_merge_coins := v_merge_coins + 3 * (1 << (v_level - 1));
      end if;
      v_board[v_from] := 0;
      v_board[v_to] := v_level;
      v_peak := greatest(v_peak, v_level);
    elsif v_action->>'type' = 'release' then
      if 0 = any(v_board) or v_board[v_to] <> (select min(lv) from unnest(v_board) as levels(lv))
        or exists (select 1 from unnest(v_board) as levels(lv) where lv < 12 group by lv having count(*) > 1) then
        raise sqlstate 'PT422' using message = 'board_not_blocked';
      end if;
      v_board[v_to] := 0;
    else
      raise sqlstate 'PT400' using message = 'invalid_action';
    end if;
  end loop;

  -- Conservative M2c envelope: 30 slots, rare ×10, Bonus Lv.100 (×11),
  -- video boost ×2. Merge grants follow replay, squishes at most 3 × 8/min.
  v_paid_seconds := least(v_elapsed, 28800);
  v_max_gain := ceil(v_paid_seconds * 30 * (1 << greatest(0, v_peak - 1)) * 10 * 11 * 2)
    + v_merge_coins + 24 * ceil(v_paid_seconds / 60);
  if p_coins > v_save.coins + v_max_gain then
    raise sqlstate 'PT422' using message = 'coin_gain_exceeds_bound';
  end if;

  update public.cloud_saves set revision = v_save.revision + 1, coins = p_coins, payload = p_save,
    verified_board = v_board, peak_level = v_peak, total_merges = v_save.total_merges + v_merges,
    spawn_budget = v_budget, synced_at = greatest(v_now, v_save.synced_at)
  where user_id = p_user;
  insert into public.cloud_sync_requests (user_id, request_id, revision)
  values (p_user, p_request, v_save.revision + 1);

  if v_spawns + v_merges > 0 then
    insert into public.verified_activity (user_id, active_day, spawns, merges, peak_merge)
    values (p_user, public.mochi_period('daily', v_now), v_spawns, v_merges, v_merge_peak)
    on conflict (user_id, active_day) do update set
      spawns = public.verified_activity.spawns + excluded.spawns,
      merges = public.verified_activity.merges + excluded.merges,
      peak_merge = greatest(public.verified_activity.peak_merge, excluded.peak_merge);

    insert into public.mission_progress (user_id, mission_id, period_start, progress)
    select p_user, m.id, public.mochi_period(m.cadence, v_now),
      least(m.goal, case m.metric when 'spawn' then v_spawns else v_merges end)
    from public.missions m
    on conflict (user_id, mission_id, period_start) do update
    set progress = least((select goal from public.missions where id = excluded.mission_id),
      public.mission_progress.progress + excluded.progress);
  end if;
  return public.mochi_read_save(p_user) || jsonb_build_object('duplicate', false);
end;
$$;

create function public.mochi_missions(p_user uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'cadence', m.cadence, 'title', m.title, 'goal', m.goal, 'points', m.points,
    'period_start', public.mochi_period(m.cadence, statement_timestamp()),
    'progress', coalesce(p.progress, 0), 'claimed', p.claimed_at is not null
  ) order by m.cadence, m.id), '[]'::jsonb)
  from public.missions m
  left join public.mission_progress p on p.mission_id = m.id and p.user_id = p_user
    and p.period_start = public.mochi_period(m.cadence, statement_timestamp());
$$;

create function public.mochi_claim_mission(p_user uuid, p_mission text, p_period date) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_mission public.missions%rowtype;
  v_progress public.mission_progress%rowtype;
  v_key text := p_user::text || ':' || p_mission || ':' || to_char(p_period, 'YYYY-MM-DD');
begin
  perform 1 from public.profiles where id = p_user for update;
  select * into v_mission from public.missions where id = p_mission;
  if not found then
    raise sqlstate 'PT404' using message = 'mission_not_found';
  end if;
  select * into v_progress from public.mission_progress
    where user_id = p_user and mission_id = p_mission and period_start = p_period for update;
  if v_progress.claimed_at is not null then
    return jsonb_build_object('status', 'duplicate', 'points', v_mission.points);
  end if;
  if p_period is distinct from public.mochi_period(v_mission.cadence, statement_timestamp())
    or v_progress.progress is null or v_progress.progress < v_mission.goal then
    raise sqlstate 'PT422' using message = 'mission_not_claimable';
  end if;
  insert into public.wallet_ledger (user_id, source, event_key, points)
  values (p_user, 'mission', v_key, v_mission.points);
  update public.mission_progress set claimed_at = statement_timestamp()
  where user_id = p_user and mission_id = p_mission and period_start = p_period;
  return jsonb_build_object('status', 'credited', 'points', v_mission.points);
end;
$$;

create function public.mochi_score(p_user uuid, p_scope text, p_period date) returns integer
language sql stable set search_path = '' as $$
  select case when p_scope = 'all_time' then coalesce((
    select peak_level * 1000 + least(999, total_merges)::integer
    from public.cloud_saves where user_id = p_user and total_merges > 0), 0)
  else (
    select coalesce(max(peak_merge), 0) * 1000 + least(999, coalesce(sum(merges), 0))::integer
    from public.verified_activity
    where user_id = p_user and active_day >= p_period and active_day < p_period + 7
  ) end;
$$;

create function public.mochi_leaderboard(p_user uuid, p_scope text, p_score integer default null) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_period date := public.mochi_period(p_scope, statement_timestamp());
  v_verified integer;
  v_top jsonb;
  v_me jsonb;
begin
  if p_scope is null or p_scope not in ('weekly', 'all_time') then
    raise sqlstate 'PT400' using message = 'invalid_scope';
  end if;
  v_verified := public.mochi_score(p_user, p_scope, v_period);
  if p_score is not null then
    if v_verified < 1001 or p_score <> v_verified then
      raise sqlstate 'PT422' using message = 'score_not_verified';
    end if;
    insert into public.leaderboard_scores (scope, period_start, user_id, score)
    values (p_scope, v_period, p_user, v_verified)
    on conflict (scope, period_start, user_id) do update
    set score = excluded.score, achieved_at = statement_timestamp()
    where public.leaderboard_scores.score < excluded.score;
  end if;

  with top_scores as (
    select l.score, l.achieved_at, l.user_id, p.public_alias as alias
    from public.leaderboard_scores l join public.profiles p on p.id = l.user_id
    where l.scope = p_scope and l.period_start = v_period
    order by l.score desc, l.achieved_at, l.user_id limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', rank, 'score', score, 'alias', alias, 'is_me', user_id = p_user
  ) order by rank), '[]'::jsonb) into v_top
  from (select *, row_number() over (order by score desc, achieved_at, user_id) as rank from top_scores) t;

  select jsonb_build_object('rank', 1 + (
    select count(*) from public.leaderboard_scores b where b.scope = p_scope and b.period_start = v_period
      and (b.score > m.score or (b.score = m.score and (b.achieved_at, b.user_id) < (m.achieved_at, m.user_id)))
  ), 'score', m.score) into v_me
  from public.leaderboard_scores m where m.user_id = p_user and m.scope = p_scope and m.period_start = v_period;
  return jsonb_build_object('scope', p_scope, 'period_start', v_period, 'verified_score', v_verified,
    'top', v_top, 'me', v_me);
end;
$$;
