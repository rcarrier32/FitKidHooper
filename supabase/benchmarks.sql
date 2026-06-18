-- Fit Kid Hooper — Benchmarks (accuracy mini-phase).
-- Run after progression.sql.
--
-- An append-only series of measured tests (FT%, spot %, etc.). Personal bests and
-- improvement-over-time derive from this. Crossing a benchmark's threshold earns a
-- certification — an equippable TITLE granted into the existing achievement ledger
-- (reward real accuracy, not just volume). No new reward system.

create table if not exists public.benchmark_results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  benchmark_id text not null,
  value numeric not null,
  recorded_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_benchmark_athlete on public.benchmark_results(athlete_id, benchmark_id);

alter table public.benchmark_results enable row level security;

drop policy if exists "benchmark_self_write" on public.benchmark_results;
create policy "benchmark_self_write" on public.benchmark_results
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Self + friends + co-board members can read (mirrors the ledger; powers future Coach).
drop policy if exists "benchmark_social_read" on public.benchmark_results;
create policy "benchmark_social_read" on public.benchmark_results
  for select using (
    benchmark_results.athlete_id = auth.uid()
    or exists (select 1 from public.friendships f
               where (f.athlete_a = auth.uid() and f.athlete_b = benchmark_results.athlete_id)
                  or (f.athlete_b = auth.uid() and f.athlete_a = benchmark_results.athlete_id))
    or exists (select 1 from public.board_members m_self
               join public.board_members m_other on m_self.board_id = m_other.board_id
               where m_self.athlete_id = auth.uid()
                 and m_other.athlete_id = benchmark_results.athlete_id)
  );
