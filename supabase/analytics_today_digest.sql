-- analytics_today_digest.sql — "Today" surface for the product command center.
-- Run in the Supabase SQL editor after analytics.sql + feedback_triage.sql.
--
-- Two views, both read-only and admin-gated by the existing RLS on
-- events / athlete_analytics / feedback (security_invoker = on, so a
-- non-admin sees an empty result rather than an error):
--
--   analytics_needs_attention — many rows: "what needs me?" Each row is an
--                               athlete or a feedback ticket you can act on.
--   analytics_today_digest    — one row: "is the product OK today?" with a
--                               prior-period comparison for every headline
--                               number. Reads the attention view, so that one
--                               is defined first.
--
-- Windows are UTC days, matching analytics_dau / analytics_mission_completion.
-- Idempotent and additive. Safe to re-run.

-- ── Needs attention ──────────────────────────────────────────
-- One row per thing a founder can actually do something about. Deliberately
-- NOT a metrics feed: global trends live in the digest below. Every row here
-- points at an athlete (athlete_id) or a feedback ticket (ref_id) so the
-- dashboard can click straight through to it.

create or replace view public.analytics_needs_attention as
with sessions_by_athlete as (
  select
    athlete_id,
    count(*)        as sessions,
    max(created_at) as last_session_at
  from public.events
  where event_name = 'session_start'
  group by athlete_id
),
-- Was genuinely engaged, then stopped. 3+ sessions filters out the
-- one-and-done bounces, which are an onboarding problem, not a save-this-kid one.
lapsed as (
  select
    'lapsed'::text                                                          as kind,
    'warn'::text                                                            as severity,
    s.athlete_id                                                            as athlete_id,
    null::uuid                                                              as ref_id,
    'Lapsed after ' || s.sessions || ' sessions'                            as label,
    'Last active ' || (extract(day from now() - s.last_session_at))::int
      || ' days ago'                                                        as detail,
    s.last_session_at                                                       as occurred_at
  from sessions_by_athlete s
  where s.sessions >= 3
    and s.last_session_at <  now() - interval '7 days'
    and s.last_session_at >= now() - interval '30 days'
),
-- Signed up but never trained — the onboarding promise didn't land.
stalled_new as (
  select
    'stalled_new'::text                                                     as kind,
    'warn'::text                                                            as severity,
    aa.athlete_id                                                           as athlete_id,
    null::uuid                                                              as ref_id,
    'Signed up, never trained'                                              as label,
    'Joined ' || (extract(day from now() - aa.first_session_at))::int
      || ' days ago — no exercise completed'                                as detail,
    aa.first_session_at                                                     as occurred_at
  from public.athlete_analytics aa
  where aa.first_session_at >= now() - interval '14 days'
    and aa.first_session_at <  now() - interval '1 day'
    and not exists (
      select 1 from public.events e
      where e.athlete_id = aa.athlete_id
        and e.event_name = 'exercise_complete'
    )
),
-- Someone told us something is wrong and nobody has triaged it yet.
unhappy_feedback as (
  select
    'feedback'::text                                                        as kind,
    'crit'::text                                                            as severity,
    f.athlete_id                                                            as athlete_id,
    f.id                                                                    as ref_id,
    case
      when f.category = 'bug'          then 'Bug report — untriaged'
      when f.sentiment = 'thumbs_down' then 'Thumbs down'
      else 'Low rating (' || f.rating || '/5)'
    end                                                                     as label,
    left(coalesce(nullif(trim(f.message), ''), '(no message left)'), 100)   as detail,
    f.created_at                                                            as occurred_at
  from public.feedback f
  where f.status in ('open', 'triaged')
    and f.created_at >= now() - interval '30 days'
    and (f.category = 'bug' or f.sentiment = 'thumbs_down' or f.rating <= 2)
),
-- The app told us it failed. Rare, but it should never be silent.
sync_errors as (
  select
    'sync_error'::text                                                      as kind,
    'warn'::text                                                            as severity,
    e.athlete_id                                                            as athlete_id,
    null::uuid                                                              as ref_id,
    'Leaderboard sync failed'                                               as label,
    coalesce(nullif(e.properties->>'error', ''), 'unknown error')           as detail,
    e.created_at                                                            as occurred_at
  from public.events e
  where e.event_name = 'leaderboard_push'
    and coalesce(e.properties->>'success', 'true') = 'false'
    and e.created_at >= now() - interval '7 days'
),
-- Postgres only allows plain result-column names in a UNION's ORDER BY, so the
-- union lands in a CTE and the severity ranking sorts outside it.
all_items as (
  select * from lapsed
  union all select * from stalled_new
  union all select * from unhappy_feedback
  union all select * from sync_errors
)
select *
from all_items
order by
  case severity when 'crit' then 0 else 1 end,
  occurred_at desc;

-- Counts per kind, so the dashboard can show exact "what needs me" chips
-- without fetching every row (35 identical sync errors shouldn't have to be
-- downloaded to be counted).
create or replace view public.analytics_needs_attention_summary as
select
  kind,
  severity,
  count(*)                    as items,
  count(distinct athlete_id)  as athletes,
  max(occurred_at)            as last_seen
from public.analytics_needs_attention
group by kind, severity
order by
  case severity when 'crit' then 0 else 1 end,
  count(*) desc;

-- ── Today digest ─────────────────────────────────────────────
-- Every metric carries its own prior period so the dashboard can show a
-- direction, not just a number. Rates use 7d windows rather than single
-- days: at FKH's volume one quiet Tuesday would otherwise read as a crash.

create or replace view public.analytics_today_digest as
with sess as (
  select
    (created_at at time zone 'utc')::date as day,
    athlete_id
  from public.events
  where event_name = 'session_start'
    and created_at >= now() - interval '40 days'
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
  from public.athlete_analytics
),
mission as (
  select
    count(distinct athlete_id) filter (where event_name = 'mission_claim'
                                         and created_at >= now() - interval '7 days')   as claimers_7d,
    count(distinct athlete_id) filter (where event_name = 'session_start'
                                         and created_at >= now() - interval '7 days')   as actives_7d,
    count(distinct athlete_id) filter (where event_name = 'mission_claim'
                                         and created_at >= now() - interval '14 days'
                                         and created_at <  now() - interval '7 days')   as claimers_prev_7d,
    count(distinct athlete_id) filter (where event_name = 'session_start'
                                         and created_at >= now() - interval '14 days'
                                         and created_at <  now() - interval '7 days')   as actives_prev_7d
  from public.events
  where event_name in ('mission_claim', 'session_start')
    and created_at >= now() - interval '14 days'
),
duration as (
  -- Weight each day's average by its session count — a plain avg of daily
  -- averages would let a 2-session day outvote a 200-session day.
  select
    round((sum(avg_duration_sec * sessions) filter (where day > (now() at time zone 'utc')::date - 7)
           / nullif(sum(sessions) filter (where day > (now() at time zone 'utc')::date - 7), 0))::numeric, 1)
      as avg_session_7d_sec,
    round((sum(avg_duration_sec * sessions) filter (where day <= (now() at time zone 'utc')::date - 7
                                                      and day >  (now() at time zone 'utc')::date - 14)
           / nullif(sum(sessions) filter (where day <= (now() at time zone 'utc')::date - 7
                                            and day >  (now() at time zone 'utc')::date - 14), 0))::numeric, 1)
      as avg_session_prev_7d_sec
  from public.analytics_avg_session_duration
  where day > (now() at time zone 'utc')::date - 14
),
retention as (
  select
    round(avg(d1_pct)::numeric, 1) as d1_pct_recent,
    round(avg(d7_pct)::numeric, 1) as d7_pct_recent
  from public.analytics_retention
  where cohort_day > (now() at time zone 'utc')::date - 30
),
attention as (
  select
    count(*)                                  as attention_total,
    count(*) filter (where severity = 'crit') as attention_crit
  from public.analytics_needs_attention
)
select
  a.dau_today,
  a.dau_yesterday,
  a.dau_today - a.dau_yesterday                                                    as dau_delta,
  a.active_7d,
  a.active_prev_7d,
  n.new_today,
  n.new_7d,
  n.new_prev_7d,
  n.total_athletes,
  round(100.0 * m.claimers_7d      / nullif(m.actives_7d, 0), 1)                   as mission_rate_7d_pct,
  round(100.0 * m.claimers_prev_7d / nullif(m.actives_prev_7d, 0), 1)              as mission_rate_prev_7d_pct,
  d.avg_session_7d_sec,
  d.avg_session_prev_7d_sec,
  r.d1_pct_recent,
  r.d7_pct_recent,
  t.attention_total,
  t.attention_crit
from active a, newcomers n, mission m, duration d, retention r, attention t;

-- Inherit the caller's RLS: admins see everything, everyone else sees nothing.
alter view public.analytics_needs_attention         set (security_invoker = on);
alter view public.analytics_needs_attention_summary set (security_invoker = on);
alter view public.analytics_today_digest            set (security_invoker = on);

notify pgrst, 'reload schema';
