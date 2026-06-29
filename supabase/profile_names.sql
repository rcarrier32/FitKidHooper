-- profile_names.sql
-- Adds first_name / last_name to athlete_profiles.
--
-- Background: the app (auth.js) writes first_name/last_name on profile upsert so
-- boards can show "First L.". The columns were referenced in app code before they
-- existed in the database, so every profile save with a first name set failed with
-- PostgREST error PGRST204 ("Could not find the 'first_name' column ... in the
-- schema cache") -> HTTP 400. This migration adds the columns.
--
-- Idempotent and additive. Safe to re-run.

alter table public.athlete_profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- Reload PostgREST schema cache so the new columns are accepted immediately.
notify pgrst, 'reload schema';
