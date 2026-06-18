-- Fit Kid Hooper — Phase D: Feed reactions (fixed-emoji, friends-only, kid-safe).
-- Run after progression.sql + boards.sql.
create table if not exists public.feed_reactions (
  actor_id       uuid not null references public.athlete_profiles(id) on delete cascade,
  target_id      uuid not null references public.athlete_profiles(id) on delete cascade,
  achievement_id text not null,
  emoji          text not null check (emoji in ('clap','fire','ball','goat')),
  created_at     timestamptz not null default now(),
  primary key (actor_id, target_id, achievement_id, emoji)
);
create index if not exists idx_reactions_item on public.feed_reactions(target_id, achievement_id);
alter table public.feed_reactions enable row level security;

drop policy if exists "reactions_insert" on public.feed_reactions;
create policy "reactions_insert" on public.feed_reactions for insert
  with check (actor_id = auth.uid() and (target_id = auth.uid()
    or exists (select 1 from public.friendships f
               where (f.athlete_a = auth.uid() and f.athlete_b = target_id)
                  or (f.athlete_b = auth.uid() and f.athlete_a = target_id))));
drop policy if exists "reactions_delete" on public.feed_reactions;
create policy "reactions_delete" on public.feed_reactions for delete using (actor_id = auth.uid());
drop policy if exists "reactions_select" on public.feed_reactions;
create policy "reactions_select" on public.feed_reactions for select
  using (actor_id = auth.uid() or target_id = auth.uid()
    or exists (select 1 from public.friendships f
               where (f.athlete_a = auth.uid() and f.athlete_b = feed_reactions.target_id)
                  or (f.athlete_b = auth.uid() and f.athlete_a = feed_reactions.target_id)));
