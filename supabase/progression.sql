-- Fit Kid Hooper — Phase B: progression ledger + equipped identity.
-- Run after schema.sql, analytics.sql, boards.sql.
--
-- ONE ledger of earned things (badges, mastery milestones, titles, cosmetics,
-- recognition). Titles/Cosmetics are equippable rows; Challenges/Feed/Coach read
-- this — they never add a parallel earn/own system.

create table if not exists public.athlete_achievements (
  athlete_id     uuid not null references public.athlete_profiles(id) on delete cascade,
  achievement_id text not null,
  kind           text not null check (kind in ('badge','milestone','title','cosmetic','recognition')),
  family         text,
  earned_at      timestamptz not null default now(),
  context        jsonb not null default '{}',
  primary key (athlete_id, achievement_id)
);
create index if not exists idx_ach_athlete on public.athlete_achievements(athlete_id);

alter table public.athlete_achievements enable row level security;

drop policy if exists "ach_self_write" on public.athlete_achievements;
create policy "ach_self_write" on public.athlete_achievements
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Self + friends + co-board members can read (mirrors athlete_profiles_select).
drop policy if exists "ach_social_read" on public.athlete_achievements;
create policy "ach_social_read" on public.athlete_achievements
  for select using (
    athlete_achievements.athlete_id = auth.uid()
    or exists (select 1 from public.friendships f
               where (f.athlete_a = auth.uid() and f.athlete_b = athlete_achievements.athlete_id)
                  or (f.athlete_b = auth.uid() and f.athlete_a = athlete_achievements.athlete_id))
    or exists (select 1 from public.board_members m_self
               join public.board_members m_other on m_self.board_id = m_other.board_id
               where m_self.athlete_id = auth.uid()
                 and m_other.athlete_id = athlete_achievements.athlete_id)
  );

-- Equipped identity (friend-visible via athlete_profiles_select).
alter table public.athlete_profiles
  add column if not exists active_title text,
  add column if not exists equipped jsonb not null default '{}'::jsonb;

-- Denormalized identity for the public age-group board projection.
alter table public.leaderboard_stats
  add column if not exists active_title text,
  add column if not exists play_like text;

-- Structured favorites (current / all-time via favorite_player / who they play like).
alter table public.athlete_profiles
  add column if not exists favorite_current text,
  add column if not exists favorite_playlike text;
