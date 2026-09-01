-- Let an age group say "adult".
--
-- The app was built on the assumption that every user is 8–18, and the
-- birthday picker enforced it. At least one real account belongs to an adult,
-- who therefore could not enter a birthday at all — which left him with no age,
-- no leaderboard bracket, and a permanent "grab a grown-up" prompt he can never
-- satisfy.
--
-- Widening the client without this migration would be worse than leaving it
-- alone: these four CHECK constraints would reject every event, stat and
-- profile write for an adult, so their training would silently fail to record.
-- Apply this BEFORE deploying the client that can produce 'adult'.
--
-- Purely additive: it widens what is permitted and rewrites no rows, so
-- existing data cannot be invalidated and rolling back only requires the old
-- ARRAY literal.

alter table public.athlete_profiles   drop constraint if exists athlete_profiles_age_group_check;
alter table public.leaderboard_stats  drop constraint if exists leaderboard_stats_age_group_check;
alter table public.events             drop constraint if exists events_age_group_check;
alter table public.athlete_analytics  drop constraint if exists athlete_analytics_age_group_check;

alter table public.athlete_profiles
  add constraint athlete_profiles_age_group_check
  check (age_group = any (array['u10','u12','u14','u17','adult','unknown']));

alter table public.leaderboard_stats
  add constraint leaderboard_stats_age_group_check
  check (age_group = any (array['u10','u12','u14','u17','adult','unknown']));

alter table public.events
  add constraint events_age_group_check
  check (age_group = any (array['u10','u12','u14','u17','adult','unknown']));

alter table public.athlete_analytics
  add constraint athlete_analytics_age_group_check
  check (age_group = any (array['u10','u12','u14','u17','adult','unknown']));
