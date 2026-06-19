-- Per-athlete analytics derived from `events` — the single source of truth.
--
-- Previously the headline tiles (Total / Active / New athletes), retention, and
-- the athlete drill-downs read from the `athlete_analytics` table, which the
-- client upserts on session_start. That table silently drifts: clients on older
-- cached PWA bundles never ran the upsert, so it held only a fraction of real
-- athletes (e.g. 3 rows while `events` had 9 active athletes — producing the
-- impossible "Total 3 < WAU 9").
--
-- These views recompute everything from `events` so the athlete metrics are
-- always accurate and self-consistent with DAU/WAU/MAU. They also surface a
-- human identity (username, display name) so the admin dashboard shows who's who.
--
-- security_invoker = on → the underlying `events` RLS (is_fkh_admin()) applies,
-- keeping these admin-only.

-- Let admins read all athlete profiles (additive; everyone else keeps the
-- existing friend/co-member visibility).
drop policy if exists athlete_profiles_admin_select on public.athlete_profiles;
create policy athlete_profiles_admin_select
  on public.athlete_profiles for select
  using (public.is_fkh_admin());

-- Reading athlete_profiles via a join inside the rollup trips a pre-existing
-- recursion in the board_members RLS policy; this SECURITY DEFINER helper reads
-- the display name with RLS bypassed instead.
create or replace function public.athlete_display_name(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select display_name from public.athlete_profiles where id = p_id;
$$;

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
  l.app_version,
  un.username,
  public.athlete_display_name(s.athlete_id) as display_name
from sessions s
left join best_age          b  on b.athlete_id = s.athlete_id
left join latest            l  on l.athlete_id = s.athlete_id
left join public.auth_usernames un on un.user_id = s.athlete_id
-- an "athlete" = a device/user that has logged at least one session_start
where s.first_session_at is not null;

create or replace view public.analytics_athlete_summary
with (security_invoker = on) as
select
  count(*) filter (where last_session_at  >= now() - interval '7 days') as active_athletes_7d,
  count(*) filter (where first_session_at >= now() - interval '7 days') as new_athletes_7d,
  count(*) as total_athletes
from public.athlete_rollup;

-- Retention cohorts also derive from the rollup (was sourced from the drifting
-- athlete_analytics table, which made D1 read 0% over the wrong 3 athletes).
create or replace view public.analytics_retention
with (security_invoker = on) as
with cohorts as (
  select athlete_id, (first_session_at at time zone 'utc')::date as cohort_day
  from public.athlete_rollup
),
activity as (
  select distinct athlete_id, (created_at at time zone 'utc')::date as active_day
  from public.events
  where event_name = 'session_start'
)
select
  c.cohort_day,
  count(distinct c.athlete_id) as cohort_size,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 1  then c.athlete_id end)::numeric
        / nullif(count(distinct c.athlete_id), 0), 1) as d1_pct,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 7  then c.athlete_id end)::numeric
        / nullif(count(distinct c.athlete_id), 0), 1) as d7_pct,
  round(100.0 * count(distinct case when a.active_day = c.cohort_day + 30 then c.athlete_id end)::numeric
        / nullif(count(distinct c.athlete_id), 0), 1) as d30_pct
from cohorts c
left join activity a on a.athlete_id = c.athlete_id
group by c.cohort_day
order by c.cohort_day desc;
