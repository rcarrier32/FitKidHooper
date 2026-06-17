-- Fit Kid Hooper — Product analytics (run after schema.sql)
-- Lightweight event + feedback layer for first-100-user learning.
-- COPPA-conscious: no names/DOB in events; athlete_id is device UUID only.

-- ── Tables ────────────────────────────────────────────────────

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null,
  event_name text not null,
  properties jsonb not null default '{}',
  app_version text,
  age_group text check (age_group in ('u10', 'u12', 'u14', 'u17', 'unknown')),
  created_at timestamptz not null default now()
);

create index if not exists idx_events_athlete_time on public.events (athlete_id, created_at desc);
create index if not exists idx_events_name_time on public.events (event_name, created_at desc);
create index if not exists idx_events_created_at on public.events (created_at desc);

-- Cohort anchor for retention (one row per device)
create table if not exists public.athlete_analytics (
  athlete_id uuid primary key,
  first_session_at timestamptz not null,
  last_session_at timestamptz,
  age_group text check (age_group in ('u10', 'u12', 'u14', 'u17', 'unknown')),
  app_version text,
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid,
  rating smallint check (rating between 1 and 5),
  sentiment text check (sentiment in ('thumbs_up', 'thumbs_down')),
  category text not null default 'general'
    check (category in ('general', 'bug', 'feature_request')),
  message text,
  app_version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created on public.feedback (created_at desc);
create index if not exists idx_feedback_category on public.feedback (category, created_at desc);

-- ── RLS (MVP: anon insert + read for small-team dashboard) ───
-- Tighten SELECT policies before broader public launch.

alter table public.events enable row level security;
alter table public.athlete_analytics enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert with check (true);

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select using (true);

drop policy if exists "athlete_analytics_all" on public.athlete_analytics;
create policy "athlete_analytics_all" on public.athlete_analytics for all using (true) with check (true);

drop policy if exists "feedback_insert" on public.feedback;
create policy "feedback_insert" on public.feedback for insert with check (true);

drop policy if exists "feedback_select" on public.feedback;
create policy "feedback_select" on public.feedback for select using (true);

-- ── Active users ──────────────────────────────────────────────

create or replace view public.analytics_dau as
select
  (created_at at time zone 'utc')::date as day,
  count(distinct athlete_id) as dau
from public.events
where event_name = 'session_start'
group by 1
order by 1 desc;

create or replace view public.analytics_wau as
select
  date_trunc('week', created_at at time zone 'utc')::date as week_start,
  count(distinct athlete_id) as wau
from public.events
where event_name = 'session_start'
group by 1
order by 1 desc;

create or replace view public.analytics_mau as
select
  date_trunc('month', created_at at time zone 'utc')::date as month_start,
  count(distinct athlete_id) as mau
from public.events
where event_name = 'session_start'
group by 1
order by 1 desc;

-- ── Retention ─────────────────────────────────────────────────

create or replace view public.analytics_retention as
with cohorts as (
  select
    athlete_id,
    (first_session_at at time zone 'utc')::date as cohort_day
  from public.athlete_analytics
),
activity as (
  select distinct
    athlete_id,
    (created_at at time zone 'utc')::date as active_day
  from public.events
  where event_name = 'session_start'
)
select
  c.cohort_day,
  count(distinct c.athlete_id) as cohort_size,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 1 then c.athlete_id end)
    / nullif(count(distinct c.athlete_id), 0), 1) as d1_pct,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 7 then c.athlete_id end)
    / nullif(count(distinct c.athlete_id), 0), 1) as d7_pct,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 30 then c.athlete_id end)
    / nullif(count(distinct c.athlete_id), 0), 1) as d30_pct
from cohorts c
left join activity a on a.athlete_id = c.athlete_id
group by 1
order by 1 desc;

-- ── Engagement ────────────────────────────────────────────────

create or replace view public.analytics_sessions_per_week as
select
  date_trunc('week', created_at at time zone 'utc')::date as week_start,
  round(count(*)::numeric / nullif(count(distinct athlete_id), 0), 2) as avg_sessions_per_athlete
from public.events
where event_name = 'session_start'
group by 1
order by 1 desc;

create or replace view public.analytics_training_days_per_week as
with daily_training as (
  select distinct
    athlete_id,
    date_trunc('week', created_at at time zone 'utc')::date as week_start,
    (created_at at time zone 'utc')::date as train_day
  from public.events
  where event_name = 'exercise_complete'
)
select
  week_start,
  round(count(*)::numeric / nullif(count(distinct athlete_id), 0), 2) as avg_training_days_per_athlete
from daily_training
group by 1
order by 1 desc;

-- ── Feature usage ─────────────────────────────────────────────

create or replace view public.analytics_top_screens as
select
  properties->>'screen' as screen,
  count(*) as views,
  count(distinct athlete_id) as unique_athletes
from public.events
where event_name = 'screen_view'
  and properties->>'screen' is not null
group by 1
order by views desc;

create or replace view public.analytics_top_exercises as
select
  properties->>'exercise_id' as exercise_id,
  count(*) as completions,
  count(distinct athlete_id) as unique_athletes
from public.events
where event_name = 'exercise_complete'
  and properties->>'exercise_id' is not null
group by 1
order by completions desc;

create or replace view public.analytics_top_programs as
select
  properties->>'program_id' as program_id,
  count(*) as session_completions,
  count(distinct athlete_id) as unique_athletes
from public.events
where event_name = 'program_session_complete'
  and properties->>'program_id' is not null
group by 1
order by session_completions desc;

-- ── Mission / challenge / badge rates ─────────────────────────

create or replace view public.analytics_mission_completion as
with daily_missions as (
  select
    (created_at at time zone 'utc')::date as day,
    count(distinct athlete_id) as claimers
  from public.events
  where event_name = 'mission_claim'
  group by 1
),
daily_active as (
  select
    (created_at at time zone 'utc')::date as day,
    count(distinct athlete_id) as active
  from public.events
  where event_name = 'session_start'
  group by 1
)
select
  a.day,
  a.active,
  coalesce(m.claimers, 0) as mission_claims,
  round(100.0 * coalesce(m.claimers, 0) / nullif(a.active, 0), 1) as mission_rate_pct
from daily_active a
left join daily_missions m on m.day = a.day
order by a.day desc;

create or replace view public.analytics_challenge_completion as
select
  properties->>'challenge_id' as challenge_id,
  count(*) as completions,
  count(distinct athlete_id) as unique_athletes
from public.events
where event_name = 'challenge_complete'
group by 1
order by completions desc;

create or replace view public.analytics_badge_distribution as
select
  properties->>'badge_id' as badge_id,
  count(*) as earns,
  count(distinct athlete_id) as unique_athletes
from public.events
where event_name = 'badge_earn'
group by 1
order by earns desc;

-- ── Athlete summary (dashboard) ───────────────────────────────

create or replace view public.analytics_athlete_summary as
select
  count(*) filter (where last_session_at >= now() - interval '7 days') as active_athletes_7d,
  count(*) filter (where first_session_at >= now() - interval '7 days') as new_athletes_7d,
  count(*) as total_athletes
from public.athlete_analytics;

-- ── Feedback views ────────────────────────────────────────────

create or replace view public.feedback_general as
select id, athlete_id, rating, sentiment, message, app_version, created_at
from public.feedback
where category = 'general'
order by created_at desc;

create or replace view public.feedback_bugs as
select id, athlete_id, rating, sentiment, message, app_version, created_at
from public.feedback
where category = 'bug'
order by created_at desc;

create or replace view public.feedback_feature_requests as
select id, athlete_id, rating, sentiment, message, app_version, created_at
from public.feedback
where category = 'feature_request'
order by created_at desc;

create or replace view public.feedback_summary as
select
  count(*) as total,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*) filter (where sentiment = 'thumbs_up') as thumbs_up,
  count(*) filter (where sentiment = 'thumbs_down') as thumbs_down,
  count(*) filter (where category = 'feature_request') as feature_requests,
  count(*) filter (where category = 'bug') as bugs,
  count(*) filter (where category = 'general') as general
from public.feedback;
