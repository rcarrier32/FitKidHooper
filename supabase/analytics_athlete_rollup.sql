-- Per-athlete analytics derived from `events` — the single source of truth.
--
-- Previously the headline tiles (Total / Active / New athletes) and the athlete
-- drill-downs read from the `athlete_analytics` table, which the client upserts
-- on session_start. That table silently drifts: clients on older cached PWA
-- bundles never ran the upsert, and the on-conflict update was unreliable, so it
-- held only a fraction of real athletes (e.g. 3 rows while `events` had 9 active
-- athletes — producing the impossible "Total 3 < WAU 9").
--
-- These views recompute everything from `events` so the athlete metrics are
-- always accurate and self-consistent with DAU/WAU/MAU (which already derive
-- from session_start events). `athlete_analytics` + its client upsert are left
-- in place but are no longer read by the dashboard.
--
-- security_invoker = on → the underlying `events` RLS (is_fkh_admin()) applies,
-- keeping these admin-only.

create or replace view public.athlete_rollup
with (security_invoker = on) as
with sessions as (
  select
    athlete_id,
    min(created_at) filter (where event_name = 'session_start') as first_session_at,
    max(created_at) filter (where event_name = 'session_start') as last_session_at,
    count(*)        filter (where event_name = 'session_start') as session_count,
    count(*) as event_count
  from public.events
  group by athlete_id
),
best_age as (
  -- most recent KNOWN age group for the athlete
  select distinct on (athlete_id) athlete_id, age_group
  from public.events
  where age_group is not null and age_group <> 'unknown'
  order by athlete_id, created_at desc
),
latest as (
  -- most recent app version seen
  select distinct on (athlete_id) athlete_id, app_version
  from public.events
  order by athlete_id, created_at desc
)
select
  s.athlete_id,
  coalesce(b.age_group, 'unknown') as age_group,
  s.first_session_at,
  s.last_session_at,
  s.session_count,
  s.event_count,
  l.app_version
from sessions s
left join best_age b on b.athlete_id = s.athlete_id
left join latest   l on l.athlete_id = s.athlete_id
-- an "athlete" = a device that has logged at least one session_start
where s.first_session_at is not null;

create or replace view public.analytics_athlete_summary
with (security_invoker = on) as
select
  count(*) filter (where last_session_at  >= now() - interval '7 days') as active_athletes_7d,
  count(*) filter (where first_session_at >= now() - interval '7 days') as new_athletes_7d,
  count(*) as total_athletes
from public.athlete_rollup;
