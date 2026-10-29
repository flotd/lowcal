-- Run once in the Supabase SQL editor. Re-runnable; never exposes service credentials.
begin;
create table if not exists public.diaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"profile":null,"foods":[],"favorites":[],"weights":[]}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint diary_size check (octet_length(payload::text) <= 5000000)
);
create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','pro','vip')),
  expires_at timestamptz
);
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id,day)
);
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.diaries enable row level security;
alter table public.memberships enable row level security;
alter table public.ai_usage enable row level security;
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;
drop policy if exists "Read own diary" on public.diaries;
create policy "Read own diary" on public.diaries for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Read own membership" on public.memberships;
create policy "Read own membership" on public.memberships for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Read own usage" on public.ai_usage;
create policy "Read own usage" on public.ai_usage for select to authenticated using ((select auth.uid())=user_id);
-- Writes are only through the narrowly scoped RPCs below. Members cannot grant themselves Pro.
revoke all on public.diaries, public.memberships, public.ai_usage from anon, authenticated;
grant select on public.diaries, public.memberships, public.ai_usage to authenticated;

create or replace function public.save_diary(expected_version bigint, new_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); current_version bigint; next_version bigint;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(new_payload) is distinct from 'object'
     or jsonb_typeof(new_payload->'foods') is distinct from 'array'
     or jsonb_typeof(new_payload->'weights') is distinct from 'array'
     or jsonb_typeof(new_payload->'favorites') is distinct from 'array'
     or not (new_payload ? 'profile')
     or jsonb_array_length(new_payload->'foods') > 10000
     or jsonb_array_length(new_payload->'favorites') > 300
     or jsonb_array_length(new_payload->'weights') > 3000
     or octet_length(new_payload::text) > 5000000 then raise exception 'Invalid diary'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
  select version into current_version from public.diaries where user_id=owner;
  current_version := coalesce(current_version,0);
  if current_version <> expected_version then return -1; end if;
  next_version := current_version+1;
  insert into public.diaries(user_id,payload,version,updated_at) values(owner,new_payload,next_version,now())
    on conflict(user_id) do update set payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at;
  return next_version;
end; $$;

create or replace function public.reserve_ai_request()
returns boolean language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); daily_limit integer := 5; current_tier text; used integer;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  select tier into current_tier from public.memberships
    where user_id=owner and (expires_at is null or expires_at > now());
  daily_limit := case current_tier when 'vip' then 200 when 'pro' then 100 else 5 end;
  insert into public.ai_usage(user_id,day,requests) values(owner,(now() at time zone 'UTC')::date,1)
    on conflict(user_id,day) do update set requests=public.ai_usage.requests+1
      where public.ai_usage.requests < daily_limit
    returning requests into used;
  return used is not null;
end; $$;
revoke all on function public.save_diary(bigint,jsonb) from public, anon;
revoke all on function public.reserve_ai_request() from public, anon;
grant execute on function public.save_diary(bigint,jsonb) to authenticated;
grant execute on function public.reserve_ai_request() to authenticated;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.app_admins where user_id=auth.uid());
$$;
create or replace function public.grant_member_access(target_email text, access_tier text, expiry timestamptz default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if not public.is_app_admin() then raise exception 'Admin required'; end if;
  if access_tier not in ('free','pro','vip') or (expiry is not null and expiry<=now()) then raise exception 'Invalid access'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(target_email)) limit 1;
  if target_id is null then return false; end if;
  insert into public.memberships(user_id,tier,expires_at) values(target_id,access_tier,expiry)
    on conflict(user_id) do update set tier=excluded.tier,expires_at=excluded.expires_at;
  return true;
end; $$;
revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.grant_member_access(text,text,timestamptz) from public, anon;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.grant_member_access(text,text,timestamptz) to authenticated;
commit;

-- Grant selected users access from this trusted SQL editor only:
-- insert into public.memberships(user_id,tier,expires_at)
-- values ('USER_UUID_FROM_AUTH_USERS','vip',null)
-- on conflict(user_id) do update set tier=excluded.tier,expires_at=excluded.expires_at;
-- VIP gets all implemented AI modes with a 200-request/day abuse guard. No billing is implemented.
-- Enable the admin panel for your own account from this editor:
-- insert into public.app_admins(user_id) values ('YOUR_UUID_FROM_AUTH_USERS') on conflict do nothing;
