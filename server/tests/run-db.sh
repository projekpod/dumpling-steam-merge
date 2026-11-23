#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

container="$(docker run --rm -d --network none   -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17 -c listen_addresses='')"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT

ready=false
for _ in {1..60}; do
  if docker logs "$container" 2>&1 | grep 'init process complete' >/dev/null &&
      docker exec "$container" pg_isready -U postgres >/dev/null; then
    ready=true
    break
  fi
  sleep 0.5
done
if [[ "$ready" != true ]]; then
  docker logs "$container" >&2
  exit 1
fi

query() { docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres "$@"; }
query <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, service_role;
SQL

for migration in supabase/migrations/*.sql; do
  query < "$migration"
done
query < tests/database.sql

# Both requests start with enough points individually. Only one can reserve them.
query -c "update public.feature_flags set value = 'true' where name = 'CASHOUT_ENABLED';"
query -c "insert into public.wallet_ledger (user_id, source, event_key, points) values ('00000000-0000-4000-8000-000000000001', 'mission', 'concurrency-fixture', 100);"
race_log="$(mktemp -d)"
trap 'rm -rf "$race_log"; docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
query -c "select public.mochi_redeem('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000091',90);" >"$race_log/first" 2>&1 &
first=$!
query -c "select public.mochi_redeem('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000092',90);" >"$race_log/second" 2>&1 &
second=$!
set +e
wait "$first"; a=$?
wait "$second"; b=$?
set -e
if [[ ( "$a" == 0 && "$b" == 0 ) || ( "$a" != 0 && "$b" != 0 ) ]]; then
  cat "$race_log/first" "$race_log/second" >&2
  exit 1
fi
grep -q 'redemption_already_pending' "$race_log/first" "$race_log/second"
echo 'PostgreSQL integration and concurrent redemption passed.'
