-- analytics_owner_read.sql
-- Fixes anon/non-admin upserts into athlete_analytics being rejected by RLS.
--
-- Background: clients upsert their per-device session row via
-- INSERT ... ON CONFLICT (athlete_id) DO UPDATE. Postgres requires SELECT
-- visibility of the conflicting row to complete an upsert, but analytics.sql only
-- grants SELECT to admins (is_fkh_admin()). So every non-admin write was rejected
-- with 42501 ("new row violates row-level security policy") -> HTTP 400/401, and
-- the retention/cohort anchor row never got written.
--
-- Fix: let a signed-in user SELECT ONLY their own analytics row. This satisfies the
-- upsert's read requirement without exposing other athletes' analytics — admin-only
-- read of ALL rows is still preserved by the existing athlete_analytics_select policy.
--
-- Idempotent and additive. Safe to re-run.

drop policy if exists "athlete_analytics_select_own" on public.athlete_analytics;
create policy "athlete_analytics_select_own" on public.athlete_analytics
  for select using (athlete_id = auth.uid());

notify pgrst, 'reload schema';
