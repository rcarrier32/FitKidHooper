-- Fit Kid Hooper — Leaderboard schema
-- Run in Supabase SQL Editor after creating your project.

create extension if not exists "pgcrypto";

-- One row per device-generated athlete UUID
create table if not exists public.athlete_profiles (
  id uuid primary key,
  display_name text not null,
  age_group text not null check (age_group in ('u10', 'u12', 'u14', 'u17', 'unknown')),
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Latest stats per athlete per period (upserted on each push)
create table if not exists public.leaderboard_stats (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  display_name text not null,
  age_group text not null check (age_group in ('u10', 'u12', 'u14', 'u17', 'unknown')),
  period text not null check (period in ('week', 'month', 'ytd', 'all_time')),
  xp integer not null default 0,
  shots_made integer not null default 0,
  training_days integer not null default 0,
  streak integer not null default 0,
  pushed_at timestamptz not null default now(),
  unique (athlete_id, period)
);

create index if not exists idx_leaderboard_rank
  on public.leaderboard_stats (age_group, period, xp desc, shots_made desc);

alter table public.athlete_profiles enable row level security;
alter table public.leaderboard_stats enable row level security;

-- MVP: public read + anon upsert (no accounts yet)
drop policy if exists "leaderboard_stats_select" on public.leaderboard_stats;
create policy "leaderboard_stats_select"
  on public.leaderboard_stats for select using (true);

drop policy if exists "leaderboard_stats_upsert" on public.leaderboard_stats;
create policy "leaderboard_stats_upsert"
  on public.leaderboard_stats for all using (true) with check (true);

drop policy if exists "athlete_profiles_select" on public.athlete_profiles;
create policy "athlete_profiles_select"
  on public.athlete_profiles for select using (true);

drop policy if exists "athlete_profiles_upsert" on public.athlete_profiles;
create policy "athlete_profiles_upsert"
  on public.athlete_profiles for all using (true) with check (true);
