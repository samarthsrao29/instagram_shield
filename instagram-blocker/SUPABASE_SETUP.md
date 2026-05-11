# Supabase Leaderboard Setup

This extension can sync stats to Supabase and show a Daily/Weekly leaderboard.

## 1) Create a Supabase project

Enable Email auth (default). The extension uses a per-install generated email/password so users don’t need to sign up manually.

## 2) Run SQL (Tables + RLS + RPC)

Open Supabase → SQL Editor → run the script below.

```sql
-- Profiles
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous',
  updated_at timestamptz not null default now()
);

-- Recommended: set user_id automatically from the JWT user
alter table public.user_profiles alter column user_id set default auth.uid();

alter table public.user_profiles enable row level security;

create policy "profiles_select_all"
on public.user_profiles for select
to authenticated
using (true);

create policy "profiles_upsert_own"
on public.user_profiles for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.user_profiles for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Daily stats
create table if not exists public.user_daily_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  insta_time_ms bigint not null default 0,
  read_time_ms bigint not null default 0,
  blocks_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- Recommended: set user_id automatically from the JWT user
alter table public.user_daily_stats alter column user_id set default auth.uid();

alter table public.user_daily_stats enable row level security;

create policy "stats_upsert_own"
on public.user_daily_stats for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "stats_update_own"
on public.user_daily_stats for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- (Optional but recommended) allow users to read their own rows
create policy "stats_select_own"
on public.user_daily_stats for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Leaderboard: everyone can read aggregated results via RPC (security definer)
create or replace function public.get_leaderboard_daily(p_limit int default 25)
returns table (
  user_id uuid,
  display_name text,
  insta_time_ms bigint,
  read_time_ms bigint,
  blocks_count int
)
language sql
security definer
set search_path = public
as $$
  select
    s.user_id,
    coalesce(p.display_name, 'Anonymous') as display_name,
    s.insta_time_ms,
    s.read_time_ms,
    s.blocks_count
  from public.user_daily_stats s
  left join public.user_profiles p on p.user_id = s.user_id
  where s.date = current_date
  order by s.insta_time_ms asc, s.read_time_ms desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.get_leaderboard_daily(int) from public;
grant execute on function public.get_leaderboard_daily(int) to authenticated;

create or replace function public.get_leaderboard_weekly(p_limit int default 25)
returns table (
  user_id uuid,
  display_name text,
  insta_time_ms bigint,
  read_time_ms bigint,
  blocks_count int
)
language sql
security definer
set search_path = public
as $$
  with w as (
    select
      user_id,
      sum(insta_time_ms)::bigint as insta_time_ms,
      sum(read_time_ms)::bigint as read_time_ms,
      sum(blocks_count)::int as blocks_count
    from public.user_daily_stats
    where date >= (current_date - interval '6 days')::date
      and date <= current_date
    group by user_id
  )
  select
    w.user_id,
    coalesce(p.display_name, 'Anonymous') as display_name,
    w.insta_time_ms,
    w.read_time_ms,
    w.blocks_count
  from w
  left join public.user_profiles p on p.user_id = w.user_id
  order by w.insta_time_ms asc, w.read_time_ms desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.get_leaderboard_weekly(int) from public;
grant execute on function public.get_leaderboard_weekly(int) to authenticated;
```

## 3) Configure the extension

Create `instagram-blocker/config.local.js` (do not commit) by copying `instagram-blocker/config.example.js`.

Fill:

```js
globalThis.SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
globalThis.SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

Reload the extension in `chrome://extensions` → **Reload**.

## 4) Usage

- Extension auto-syncs stats periodically and whenever stats are saved.
- Open **Leaderboard** from the popup to see Daily/Weekly rankings.
- Set a display name in the Leaderboard page (saved locally + synced to Supabase).
