-- analytics_exclude_test_data.sql
-- Keep dev/QA/Playwright traffic out of every analytics surface.
--
-- The problem: the dashboard counted ~1300 events across ~37 "athletes" that
-- were never real kids — they were the dev server (VITE_APP_VERSION='local'),
-- Playwright personas, and local browser testing. A real user can never emit
-- app_version='local' (that value only exists when someone runs `npm run dev`),
-- so it's a high-precision "this is test data" signal. 'setup' is a legacy
-- pre-onboarding marker, also excluded.
--
-- The fix: one filtered base layer, then repoint every view at it.
--   analytics_excluded_athletes — manual list (founder/QA devices that tested
--                                 on a PRODUCTION build, so app_version is a
--                                 real git SHA and can't be auto-detected).
--   analytics_qa_athletes       — auto (local/setup) + manual, unioned.
--   av_events / av_athlete_analytics — the base tables minus QA athletes.
-- Everything else selects from av_* instead of the raw tables, so real-athlete
-- numbers and drill-downs stay consistent across the whole command center.
--
-- Idempotent and additive. Safe to re-run.

-- ── Manual exclusion list ────────────────────────────────────
create table if not exists public.analytics_excluded_athletes (
  athlete_id uuid primary key,
  reason     text,
  created_at timestamptz not null default now()
);

alter table public.analytics_excluded_athletes enable row level security;

drop policy if exists excluded_athletes_admin_all on public.analytics_excluded_athletes;
create policy excluded_athletes_admin_all
  on public.analytics_excluded_athletes for all
  using (public.is_fkh_admin())
  with check (public.is_fkh_admin());

-- ── QA athlete set (auto + manual) ───────────────────────────
create or replace view public.analytics_qa_athletes
with (security_invoker = on) as
select distinct athlete_id
  from public.events
  where app_version in ('local', 'setup')
union
select athlete_id
  from public.analytics_excluded_athletes;

-- ── Filtered base layer ──────────────────────────────────────
create or replace view public.av_events
with (security_invoker = on) as
select *
from public.events
where athlete_id not in (select athlete_id from public.analytics_qa_athletes);

create or replace view public.av_athlete_analytics
with (security_invoker = on) as
select *
from public.athlete_analytics
where athlete_id not in (select athlete_id from public.analytics_qa_athletes);

-- ── Repoint every event-derived view at av_events ────────────

create or replace view public.analytics_dau as
select (created_at at time zone 'utc')::date as day, count(distinct athlete_id) as dau
from public.av_events where event_name = 'session_start' group by 1 order by 1 desc;

create or replace view public.analytics_wau as
select date_trunc('week', created_at at time zone 'utc')::date as week_start, count(distinct athlete_id) as wau
from public.av_events where event_name = 'session_start' group by 1 order by 1 desc;

create or replace view public.analytics_mau as
select date_trunc('month', created_at at time zone 'utc')::date as month_start, count(distinct athlete_id) as mau
from public.av_events where event_name = 'session_start' group by 1 order by 1 desc;

create or replace view public.analytics_sessions_per_week as
select date_trunc('week', created_at at time zone 'utc')::date as week_start,
  round(count(*)::numeric / nullif(count(distinct athlete_id), 0), 2) as avg_sessions_per_athlete
from public.av_events where event_name = 'session_start' group by 1 order by 1 desc;

create or replace view public.analytics_training_days_per_week as
with daily_training as (
  select distinct athlete_id,
    date_trunc('week', created_at at time zone 'utc')::date as week_start,
    (created_at at time zone 'utc')::date as train_day
  from public.av_events where event_name = 'exercise_complete'
)
select week_start, round(count(*)::numeric / nullif(count(distinct athlete_id), 0), 2) as avg_training_days_per_athlete
from daily_training group by 1 order by 1 desc;

create or replace view public.analytics_avg_session_duration as
select (created_at at time zone 'utc')::date as day,
  round(avg((properties->>'duration_sec')::numeric), 1) as avg_duration_sec, count(*) as sessions
from public.av_events
where event_name = 'session_end' and properties->>'duration_sec' is not null
group by 1 order by 1 desc;

create or replace view public.analytics_session_duration_summary as
select round(avg((properties->>'duration_sec')::numeric), 1) as avg_duration_sec,
  round((percentile_cont(0.5) within group (order by (properties->>'duration_sec')::numeric))::numeric, 1) as median_duration_sec,
  count(*) as sessions
from public.av_events
where event_name = 'session_end' and properties->>'duration_sec' is not null
  and created_at >= now() - interval '30 days';

create or replace view public.analytics_screen_dwell as
with ordered as (
  select session_id, athlete_id, event_name, properties->>'screen' as screen,
    coalesce(client_ts, created_at) as at,
    lead(coalesce(client_ts, created_at)) over (partition by session_id order by coalesce(client_ts, created_at)) as next_at
  from public.av_events where session_id is not null
)
select session_id, athlete_id, screen, at as created_at,
  least(extract(epoch from (next_at - at)), 1800)::numeric as dwell_sec
from ordered
where event_name = 'screen_view' and screen is not null and next_at is not null;

create or replace view public.analytics_top_screens as
select properties->>'screen' as screen, count(*) as views, count(distinct athlete_id) as unique_athletes
from public.av_events where event_name = 'screen_view' and properties->>'screen' is not null
group by 1 order by views desc;

create or replace view public.analytics_top_exercises as
select properties->>'exercise_id' as exercise_id, count(*) as completions, count(distinct athlete_id) as unique_athletes
from public.av_events where event_name = 'exercise_complete' and properties->>'exercise_id' is not null
group by 1 order by completions desc;

create or replace view public.analytics_top_favorited_exercises as
select properties->>'exercise_id' as exercise_id, count(*) as favorites, count(distinct athlete_id) as unique_athletes
from public.av_events where event_name = 'exercise_favorite' and properties->>'exercise_id' is not null
group by 1 order by favorites desc;

create or replace view public.analytics_top_programs as
select properties->>'program_id' as program_id, count(*) as session_completions, count(distinct athlete_id) as unique_athletes
from public.av_events where event_name = 'program_session_complete' and properties->>'program_id' is not null
group by 1 order by session_completions desc;

create or replace view public.analytics_mission_completion as
with daily_missions as (
  select (created_at at time zone 'utc')::date as day, count(distinct athlete_id) as claimers
  from public.av_events where event_name = 'mission_claim' group by 1
),
daily_active as (
  select (created_at at time zone 'utc')::date as day, count(distinct athlete_id) as active
  from public.av_events where event_name = 'session_start' group by 1
)
select a.day, a.active, coalesce(m.claimers, 0) as mission_claims,
  round(100.0 * coalesce(m.claimers, 0) / nullif(a.active, 0), 1) as mission_rate_pct
from daily_active a left join daily_missions m on m.day = a.day order by a.day desc;

create or replace view public.analytics_challenge_completion as
select properties->>'challenge_id' as challenge_id, count(*) as completions, count(distinct athlete_id) as unique_athletes
from public.av_events where event_name = 'challenge_complete' group by 1 order by completions desc;

create or replace view public.analytics_badge_distribution as
select properties->>'badge_id' as badge_id, count(*) as earns, count(distinct athlete_id) as unique_athletes
from public.av_events where event_name = 'badge_earn' group by 1 order by earns desc;

create or replace view public.analytics_onboarding_daily as
select (created_at at time zone 'utc')::date as day,
  count(*) filter (where event_name = 'onboarding_complete') as profile_setups,
  count(distinct athlete_id) filter (where event_name = 'onboarding_complete') as profile_setup_athletes,
  count(*) filter (where event_name = 'onboarding_tour_complete') as tour_completes,
  count(distinct athlete_id) filter (where event_name = 'onboarding_tour_complete') as tour_complete_athletes
from public.av_events where event_name in ('onboarding_complete', 'onboarding_tour_complete')
group by 1 order by 1 desc;

create or replace view public.analytics_onboarding_funnel as
with profile_setup as (select distinct athlete_id from public.av_events where event_name = 'onboarding_complete'),
tour_done as (select distinct athlete_id from public.av_events where event_name = 'onboarding_tour_complete')
select
  (select count(*) from profile_setup) as athletes_profile_setup,
  (select count(*) from tour_done) as athletes_tour_complete,
  (select count(*) from profile_setup ps inner join tour_done td on td.athlete_id = ps.athlete_id) as athletes_both,
  round(100.0 * (select count(*) from profile_setup ps inner join tour_done td on td.athlete_id = ps.athlete_id)
    / nullif((select count(*) from profile_setup), 0), 1) as tour_completion_rate_pct;

-- athlete_rollup drives the drill-down "who" lists + athlete_summary + retention.
create or replace view public.athlete_rollup
with (security_invoker = on) as
with sessions as (
  select athlete_id,
    min(created_at) filter (where event_name = 'session_start') as first_session_at,
    max(created_at) filter (where event_name = 'session_start') as last_session_at,
    count(*)        filter (where event_name = 'session_start') as session_count,
    count(*) as event_count
  from public.av_events group by athlete_id
),
best_age as (
  select distinct on (athlete_id) athlete_id, age_group
  from public.av_events where age_group is not null and age_group <> 'unknown'
  order by athlete_id, created_at desc
),
latest as (
  select distinct on (athlete_id) athlete_id, app_version
  from public.av_events order by athlete_id, created_at desc
)
select s.athlete_id, coalesce(b.age_group, 'unknown') as age_group,
  s.first_session_at, s.last_session_at, s.session_count, s.event_count,
  l.app_version, un.username, public.athlete_display_name(s.athlete_id) as display_name,
  public.athlete_email(s.athlete_id) as email
from sessions s
left join best_age b on b.athlete_id = s.athlete_id
left join latest l on l.athlete_id = s.athlete_id
left join public.auth_usernames un on un.user_id = s.athlete_id
where s.first_session_at is not null;

create or replace view public.analytics_athlete_summary
with (security_invoker = on) as
select
  count(*) filter (where last_session_at  >= now() - interval '7 days') as active_athletes_7d,
  count(*) filter (where first_session_at >= now() - interval '7 days') as new_athletes_7d,
  count(*) as total_athletes
from public.athlete_rollup;

create or replace view public.analytics_retention
with (security_invoker = on) as
with cohorts as (
  select athlete_id, (first_session_at at time zone 'utc')::date as cohort_day from public.athlete_rollup
),
activity as (
  select distinct athlete_id, (created_at at time zone 'utc')::date as active_day
  from public.av_events where event_name = 'session_start'
)
select c.cohort_day, count(distinct c.athlete_id) as cohort_size,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 1  then c.athlete_id end)::numeric
        / nullif(count(distinct c.athlete_id), 0), 1) as d1_pct,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 7  then c.athlete_id end)::numeric
        / nullif(count(distinct c.athlete_id), 0), 1) as d7_pct,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 30 then c.athlete_id end)::numeric
        / nullif(count(distinct c.athlete_id), 0), 1) as d30_pct
from cohorts c left join activity a on a.athlete_id = c.athlete_id
group by c.cohort_day order by c.cohort_day desc;

-- ── Build 1 (Today) views, now on the filtered base ──────────
create or replace view public.analytics_needs_attention as
with sessions_by_athlete as (
  select athlete_id, count(*) as sessions, max(created_at) as last_session_at
  from public.av_events where event_name = 'session_start' group by athlete_id
),
lapsed as (
  select 'lapsed'::text as kind, 'warn'::text as severity, s.athlete_id as athlete_id, null::uuid as ref_id,
    'Lapsed after ' || s.sessions || ' sessions' as label,
    'Last active ' || (extract(day from now() - s.last_session_at))::int || ' days ago' as detail,
    s.last_session_at as occurred_at
  from sessions_by_athlete s
  where s.sessions >= 3 and s.last_session_at < now() - interval '7 days'
    and s.last_session_at >= now() - interval '30 days'
),
stalled_new as (
  select 'stalled_new'::text as kind, 'warn'::text as severity, aa.athlete_id as athlete_id, null::uuid as ref_id,
    'Signed up, never trained' as label,
    'Joined ' || (extract(day from now() - aa.first_session_at))::int || ' days ago — no exercise completed' as detail,
    aa.first_session_at as occurred_at
  from public.av_athlete_analytics aa
  where aa.first_session_at >= now() - interval '14 days' and aa.first_session_at < now() - interval '1 day'
    and not exists (select 1 from public.av_events e where e.athlete_id = aa.athlete_id and e.event_name = 'exercise_complete')
),
unhappy_feedback as (
  select 'feedback'::text as kind, 'crit'::text as severity, f.athlete_id as athlete_id, f.id as ref_id,
    case when f.category = 'bug' then 'Bug report — untriaged'
         when f.sentiment = 'thumbs_down' then 'Thumbs down'
         else 'Low rating (' || f.rating || '/5)' end as label,
    left(coalesce(nullif(trim(f.message), ''), '(no message left)'), 100) as detail,
    f.created_at as occurred_at
  from public.feedback f
  where f.status in ('open', 'triaged') and f.created_at >= now() - interval '30 days'
    and (f.category = 'bug' or f.sentiment = 'thumbs_down' or f.rating <= 2)
    and (f.athlete_id is null or f.athlete_id not in (select athlete_id from public.analytics_qa_athletes))
),
sync_errors as (
  select 'sync_error'::text as kind, 'warn'::text as severity, e.athlete_id as athlete_id, null::uuid as ref_id,
    'Leaderboard sync failed' as label,
    coalesce(nullif(e.properties->>'error', ''), 'unknown error') as detail,
    e.created_at as occurred_at
  from public.av_events e
  where e.event_name = 'leaderboard_push'
    and coalesce(e.properties->>'success', 'true') = 'false'
    and e.created_at >= now() - interval '7 days'
),
all_items as (
  select * from lapsed
  union all select * from stalled_new
  union all select * from unhappy_feedback
  union all select * from sync_errors
)
select * from all_items
order by case severity when 'crit' then 0 else 1 end, occurred_at desc;

create or replace view public.analytics_needs_attention_summary as
select kind, severity, count(*) as items, count(distinct athlete_id) as athletes, max(occurred_at) as last_seen
from public.analytics_needs_attention
group by kind, severity
order by case severity when 'crit' then 0 else 1 end, count(*) desc;

create or replace view public.analytics_today_digest as
with sess as (
  select (created_at at time zone 'utc')::date as day, athlete_id
  from public.av_events where event_name = 'session_start' and created_at >= now() - interval '40 days'
),
active as (
  select
    count(distinct athlete_id) filter (where day  = (now() at time zone 'utc')::date)      as dau_today,
    count(distinct athlete_id) filter (where day  = (now() at time zone 'utc')::date - 1)  as dau_yesterday,
    count(distinct athlete_id) filter (where day  > (now() at time zone 'utc')::date - 7)  as active_7d,
    count(distinct athlete_id) filter (where day <= (now() at time zone 'utc')::date - 7
                                         and day  > (now() at time zone 'utc')::date - 14) as active_prev_7d
  from sess
),
newcomers as (
  select
    count(*) filter (where (first_session_at at time zone 'utc')::date = (now() at time zone 'utc')::date) as new_today,
    count(*) filter (where first_session_at >= now() - interval '7 days')                                  as new_7d,
    count(*) filter (where first_session_at >= now() - interval '14 days'
                       and first_session_at <  now() - interval '7 days')                                  as new_prev_7d,
    count(*)                                                                                               as total_athletes
  from public.av_athlete_analytics
),
mission as (
  select
    count(distinct athlete_id) filter (where event_name = 'mission_claim' and created_at >= now() - interval '7 days')   as claimers_7d,
    count(distinct athlete_id) filter (where event_name = 'session_start' and created_at >= now() - interval '7 days')   as actives_7d,
    count(distinct athlete_id) filter (where event_name = 'mission_claim' and created_at >= now() - interval '14 days'
                                         and created_at < now() - interval '7 days')                                     as claimers_prev_7d,
    count(distinct athlete_id) filter (where event_name = 'session_start' and created_at >= now() - interval '14 days'
                                         and created_at < now() - interval '7 days')                                     as actives_prev_7d
  from public.av_events
  where event_name in ('mission_claim', 'session_start') and created_at >= now() - interval '14 days'
),
duration as (
  select
    round((sum(avg_duration_sec * sessions) filter (where day > (now() at time zone 'utc')::date - 7)
           / nullif(sum(sessions) filter (where day > (now() at time zone 'utc')::date - 7), 0))::numeric, 1) as avg_session_7d_sec,
    round((sum(avg_duration_sec * sessions) filter (where day <= (now() at time zone 'utc')::date - 7
                                                      and day > (now() at time zone 'utc')::date - 14)
           / nullif(sum(sessions) filter (where day <= (now() at time zone 'utc')::date - 7
                                            and day > (now() at time zone 'utc')::date - 14), 0))::numeric, 1) as avg_session_prev_7d_sec
  from public.analytics_avg_session_duration
  where day > (now() at time zone 'utc')::date - 14
),
retention as (
  select round(avg(d1_pct)::numeric, 1) as d1_pct_recent, round(avg(d7_pct)::numeric, 1) as d7_pct_recent
  from public.analytics_retention where cohort_day > (now() at time zone 'utc')::date - 30
),
attention as (
  select count(*) as attention_total, count(*) filter (where severity = 'crit') as attention_crit
  from public.analytics_needs_attention
)
select a.dau_today, a.dau_yesterday, a.dau_today - a.dau_yesterday as dau_delta,
  a.active_7d, a.active_prev_7d, n.new_today, n.new_7d, n.new_prev_7d, n.total_athletes,
  round(100.0 * m.claimers_7d / nullif(m.actives_7d, 0), 1) as mission_rate_7d_pct,
  round(100.0 * m.claimers_prev_7d / nullif(m.actives_prev_7d, 0), 1) as mission_rate_prev_7d_pct,
  d.avg_session_7d_sec, d.avg_session_prev_7d_sec, r.d1_pct_recent, r.d7_pct_recent,
  t.attention_total, t.attention_crit
from active a, newcomers n, mission m, duration d, retention r, attention t;

-- ── Re-assert security_invoker on everything touched ─────────
alter view public.analytics_qa_athletes             set (security_invoker = on);
alter view public.av_events                          set (security_invoker = on);
alter view public.av_athlete_analytics               set (security_invoker = on);
alter view public.analytics_dau                      set (security_invoker = on);
alter view public.analytics_wau                      set (security_invoker = on);
alter view public.analytics_mau                      set (security_invoker = on);
alter view public.analytics_sessions_per_week        set (security_invoker = on);
alter view public.analytics_training_days_per_week   set (security_invoker = on);
alter view public.analytics_avg_session_duration     set (security_invoker = on);
alter view public.analytics_session_duration_summary set (security_invoker = on);
alter view public.analytics_screen_dwell             set (security_invoker = on);
alter view public.analytics_top_screens              set (security_invoker = on);
alter view public.analytics_top_exercises            set (security_invoker = on);
alter view public.analytics_top_favorited_exercises  set (security_invoker = on);
alter view public.analytics_top_programs             set (security_invoker = on);
alter view public.analytics_mission_completion       set (security_invoker = on);
alter view public.analytics_challenge_completion     set (security_invoker = on);
alter view public.analytics_badge_distribution       set (security_invoker = on);
alter view public.analytics_onboarding_daily         set (security_invoker = on);
alter view public.analytics_onboarding_funnel        set (security_invoker = on);
alter view public.analytics_needs_attention          set (security_invoker = on);
alter view public.analytics_needs_attention_summary  set (security_invoker = on);
alter view public.analytics_today_digest             set (security_invoker = on);

notify pgrst, 'reload schema';
