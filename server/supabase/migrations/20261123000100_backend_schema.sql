create table public.profiles (
  id uuid primary key references auth.users(id),
  public_alias text not null unique default ('Mochi-' || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default statement_timestamp(),
  referral_code text unique check (referral_code ~ '^[0-9A-F]{16}$'),
  review_required boolean not null default false
);

create function public.mochi_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger mochi_auth_signup after insert on auth.users
for each row execute function public.mochi_create_profile();
insert into public.profiles (id) select id from auth.users on conflict do nothing;

create table public.devices (
  user_id uuid not null references public.profiles(id),
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  user_agent_hash text check (user_agent_hash ~ '^[0-9a-f]{64}$'),
  subnet_hash text check (subnet_hash ~ '^[0-9a-f]{64}$'),
  first_seen_at timestamptz not null default statement_timestamp(),
  last_seen_at timestamptz not null default statement_timestamp(),
  primary key (user_id, device_hash)
);
create index mochi_lookup_device on public.devices (device_hash, user_id);
create index mochi_lookup_soft_signals on public.devices (user_agent_hash, subnet_hash)
  where user_agent_hash is not null and subnet_hash is not null;

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  source text not null check (source in ('mission', 'referral', 'admob', 'offerwall', 'redemption_hold', 'redemption_refund')),
  event_key text not null check (char_length(event_key) between 1 and 160),
  points bigint not null check (abs(points::numeric) between 1 and 1000000000),
  created_at timestamptz not null default statement_timestamp(),
  unique (source, event_key),
  check ((source = 'redemption_hold' and points < 0) or (source <> 'redemption_hold' and points > 0))
);
create index mochi_wallet_by_owner on public.wallet_ledger (user_id, source, created_at);

create function public.mochi_reject_ledger_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'wallet_ledger_is_append_only';
end;
$$;
create trigger mochi_append_only before update or delete or truncate on public.wallet_ledger
for each statement execute function public.mochi_reject_ledger_mutation();

create table public.missions (
  id text primary key,
  cadence text not null check (cadence in ('daily', 'weekly')),
  metric text not null check (metric in ('spawn', 'merge')),
  goal integer not null check (goal > 0),
  points integer not null check (points between 1 and 1000000),
  title text not null
);

insert into public.missions (id, cadence, metric, goal, points, title) values
  ('daily-spawn', 'daily', 'spawn', 10, 5, 'Buka 10 kukusan'),
  ('daily-merge', 'daily', 'merge', 5, 8, 'Gabungkan 5 pasang mochi'),
  ('weekly-spawn', 'weekly', 'spawn', 75, 25, 'Buka 75 kukusan'),
  ('weekly-merge', 'weekly', 'merge', 30, 40, 'Gabungkan 30 pasang mochi');

create table public.mission_progress (
  user_id uuid not null references public.profiles(id),
  mission_id text not null references public.missions(id),
  period_start date not null,
  progress integer not null default 0 check (progress >= 0),
  claimed_at timestamptz,
  primary key (user_id, mission_id, period_start)
);

create table public.boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('coin_multiplier', 'free_steamer')),
  units integer not null check (units > 0),
  issued_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (expires_at > issued_at)
);
create index mochi_boosts_by_owner on public.boosts (user_id, expires_at);

create table public.leaderboard_scores (
  user_id uuid not null references public.profiles(id),
  scope text not null check (scope in ('weekly', 'all_time')),
  period_start date not null,
  score integer not null check (score between 1001 and 12999),
  achieved_at timestamptz not null default statement_timestamp(),
  primary key (scope, period_start, user_id),
  check ((scope = 'all_time') = (period_start = date '1970-01-01'))
);
create index mochi_leaderboard_rank on public.leaderboard_scores (scope, period_start, score desc, achieved_at, user_id);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id),
  invitee_id uuid not null unique references public.profiles(id),
  created_at timestamptz not null default statement_timestamp(),
  rewarded_at timestamptz,
  check (inviter_id <> invitee_id)
);
create index mochi_referrals_by_inviter on public.referrals (inviter_id);

create table public.cloud_saves (
  user_id uuid primary key references public.profiles(id),
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  coins numeric not null default 0 check (coins between 0 and 9007199254740991),
  payload jsonb not null default '{}',
  verified_board smallint[] not null default array_fill(0::smallint, array[30]),
  peak_level integer not null default 0 check (peak_level between 0 and 12),
  total_merges bigint not null default 0 check (total_merges >= 0),
  spawn_budget numeric not null default 1 check (spawn_budget between 0 and 32),
  synced_at timestamptz not null default statement_timestamp(),
  check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 49152),
  check (cardinality(verified_board) = 30)
);
create table public.cloud_sync_requests (
  user_id uuid not null references public.profiles(id),
  request_id uuid not null,
  revision bigint not null,
  primary key (user_id, request_id)
);

create table public.verified_activity (
  user_id uuid not null references public.profiles(id),
  active_day date not null,
  spawns integer not null default 0 check (spawns >= 0),
  merges integer not null default 0 check (merges >= 0),
  peak_merge integer not null default 0 check (peak_merge between 0 and 12),
  primary key (user_id, active_day)
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  request_id uuid not null,
  points bigint not null check (points between 1 and 1000000000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default statement_timestamp(),
  reviewed_at timestamptz,
  reviewer_ref text,
  unique (user_id, request_id),
  check ((status = 'pending' and reviewed_at is null and reviewer_ref is null)
    or (status <> 'pending' and reviewed_at is not null and reviewer_ref is not null))
);
create unique index mochi_single_pending on public.redemptions (user_id) where status = 'pending';

create table public.feature_flags (
  name text primary key,
  value jsonb not null,
  check ((name = 'CASHOUT_ENABLED' and jsonb_typeof(value) = 'boolean') or
    (name = 'ADS_MODE' and value in ('"none"', '"admob"', '"offerwall"')))
);
insert into public.feature_flags (name, value) values ('CASHOUT_ENABLED', 'false'), ('ADS_MODE', '"none"');

create table public.reward_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null default (statement_timestamp() + interval '30 minutes'),
  transaction_id text unique
);
create index mochi_tickets_by_owner on public.reward_tickets (user_id, created_at);

create table public.action_limits (
  user_id uuid not null references public.profiles(id),
  action text not null,
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (user_id, action)
);

create table public.risk_flags (
  user_id uuid not null references public.profiles(id),
  reason text not null,
  first_seen_at timestamptz not null default statement_timestamp(),
  last_seen_at timestamptz not null default statement_timestamp(),
  hits integer not null default 1 check (hits > 0),
  primary key (user_id, reason)
);

do $$
declare
  t text;
begin
  foreach t in array array['profiles','devices','wallet_ledger','missions','mission_progress','boosts',
    'leaderboard_scores','referrals','cloud_saves','cloud_sync_requests','verified_activity','redemptions',
    'feature_flags','reward_tickets','action_limits','risk_flags'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
  end loop;

  foreach t in array array['wallet_ledger','mission_progress','boosts','leaderboard_scores','cloud_saves',
    'verified_activity','redemptions'] loop
    execute format('create policy mochi_read_own on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

create policy mochi_read_profile on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy mochi_read_devices on public.devices for select to authenticated using (user_id = (select auth.uid()));
create policy mochi_read_referrals on public.referrals for select to authenticated
using ((select auth.uid()) in (inviter_id, invitee_id));
grant select on public.profiles, public.wallet_ledger, public.mission_progress,
  public.boosts, public.leaderboard_scores, public.verified_activity to authenticated;
grant select (user_id, first_seen_at, last_seen_at) on public.devices to authenticated;
grant select (id, created_at, rewarded_at) on public.referrals to authenticated;
grant select (user_id, revision, coins, payload, peak_level, synced_at) on public.cloud_saves to authenticated;
grant select (id, user_id, request_id, points, status, created_at, reviewed_at) on public.redemptions to authenticated;
revoke execute on function public.mochi_create_profile(), public.mochi_reject_ledger_mutation()
from public, anon, authenticated;
