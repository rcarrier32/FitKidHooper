-- Fit Kid Hooper — Path Framework optional cache (Phase B).
-- Run after progression.sql.
-- Evaluation remains client-side; these columns power social display + cross-device rail.

alter table public.athlete_profiles
  add column if not exists primary_path_id text,
  add column if not exists path_snapshot jsonb not null default '{}'::jsonb;

alter table public.leaderboard_stats
  add column if not exists primary_path_rank text,
  add column if not exists path_progress_pct smallint;
