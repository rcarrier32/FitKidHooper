-- Fit Kid Hooper — Phase C: Challenges + reward granting.
-- Run after progression.sql.
--
-- A challenge is a time-windowed competition on an EXISTING metric. Rewards are
-- EFFORT-BASED (reach the goal in the period → earn the reward), granted into the
-- achievement ledger. The ledger PK dedups, so granting is idempotent with no
-- award-tracking table. Group / Seasonal / Community are the SAME table.

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  scope text not null default 'global' check (scope in ('global','friends','team')),
  metric text not null check (metric in ('shots_made','xp','training_days','streak')),
  period text not null default 'week' check (period in ('week','month')),
  title text not null,
  emoji text not null default '🏆',
  goal_value integer,                -- reach this in the period to earn the reward
  reward_label text,                 -- shown in the UI
  reward_achievement_id text,        -- granted into athlete_achievements
  reward_kind text not null default 'cosmetic',
  reward_family text not null default 'challenge',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;
drop policy if exists "challenges_read" on public.challenges;
create policy "challenges_read" on public.challenges for select using (true);

-- Group-scoped: rewards effort (cosmetic) AND crowns a weekly champion (trophy).
insert into public.challenges (slug, scope, metric, period, title, emoji, goal_value, reward_label, reward_achievement_id)
values ('weekly-makes', 'friends', 'shots_made', 'week', 'Weekly Makes Challenge', '🏀', 250, 'Flame Trail cosmetic', 'cos-weekly-flame')
on conflict (slug) do update
  set scope = excluded.scope, goal_value = excluded.goal_value, reward_achievement_id = excluded.reward_achievement_id;

-- Grant every active challenge's reward to athletes who reached the goal this period.
-- Dynamic metric column validated against a fixed allow-list. Ledger PK dedups.
create or replace function public.settle_challenges()
returns integer
language plpgsql security definer set search_path = public
as $$
declare ch record; v_rc int; granted int := 0;
begin
  for ch in select * from public.challenges
            where active and goal_value is not null and reward_achievement_id is not null loop
    if ch.metric not in ('shots_made','xp','training_days','streak') then continue; end if;
    execute format(
      'insert into public.athlete_achievements (athlete_id, achievement_id, kind, family, context)
         select s.athlete_id, %L, %L, %L,
                jsonb_build_object(''challenge'', %L, ''period'', %L, ''goal'', %s)
         from public.leaderboard_stats s
         where s.period = %L and s.%I >= %s
         on conflict (athlete_id, achievement_id) do nothing',
      ch.reward_achievement_id, ch.reward_kind, ch.reward_family,
      ch.slug, ch.period, ch.goal_value, ch.period, ch.metric, ch.goal_value);
    get diagnostics v_rc = row_count; granted := granted + v_rc;
  end loop;
  return granted;
end; $$;
revoke execute on function public.settle_challenges() from public, anon, authenticated;

-- Immediate, self-scoped claim — client calls this on open (after sync). Grants
-- only the caller's rewards, validated against the caller's own stats.
create or replace function public.claim_my_challenge_rewards()
returns integer
language plpgsql security definer set search_path = public
as $$
declare ch record; v_uid uuid := auth.uid(); v_rc int; granted int := 0;
begin
  if v_uid is null then return 0; end if;
  for ch in select * from public.challenges
            where active and goal_value is not null and reward_achievement_id is not null loop
    if ch.metric not in ('shots_made','xp','training_days','streak') then continue; end if;
    execute format(
      'insert into public.athlete_achievements (athlete_id, achievement_id, kind, family, context)
         select %L, %L, %L, %L, jsonb_build_object(''challenge'', %L, ''period'', %L)
         where exists (select 1 from public.leaderboard_stats s
                       where s.athlete_id = %L and s.period = %L and s.%I >= %s)
         on conflict (athlete_id, achievement_id) do nothing',
      v_uid, ch.reward_achievement_id, ch.reward_kind, ch.reward_family, ch.slug, ch.period,
      v_uid, ch.period, ch.metric, ch.goal_value);
    get diagnostics v_rc = row_count; granted := granted + v_rc;
  end loop;
  return granted;
end; $$;
revoke execute on function public.claim_my_challenge_rewards() from public, anon;
grant execute on function public.claim_my_challenge_rewards() to authenticated;

-- Backstop: settle every 6 hours for everyone (covers users who don't open the app).
-- Group winner: crown a repeatable, period-keyed Champion for the top of each friend
-- neighborhood. Recognition rows render from their stored context (no catalog entry).
create or replace function public.settle_group_challenges()
returns integer
language plpgsql security definer set search_path = public
as $$
declare ch record; v_rc int; granted int := 0; v_pk text;
begin
  for ch in select * from public.challenges where active and scope in ('friends','team') loop
    if ch.metric not in ('shots_made','xp','training_days','streak') then continue; end if;
    if    ch.period = 'week'  then v_pk := to_char(now(), 'IYYY"-W"IW');
    elsif ch.period = 'month' then v_pk := to_char(now(), 'YYYY-MM');
    else continue; end if;
    execute format(
      'insert into public.athlete_achievements (athlete_id, achievement_id, kind, family, context)
       select w.athlete_id, %L, ''recognition'', ''challenge'',
              jsonb_build_object(''label'', %L, ''emoji'', ''🏆'', ''period'', %L, ''challenge'', %L)
       from (
         with vals as (select athlete_id, %I as v from public.leaderboard_stats where period = %L),
         pairs as (
           select athlete_a as me, athlete_b as fr from public.friendships
           union all select athlete_b as me, athlete_a as fr from public.friendships
         )
         select p.me as athlete_id from pairs p
         join vals mv on mv.athlete_id = p.me
         left join vals fv on fv.athlete_id = p.fr
         group by p.me, mv.v
         having mv.v > 0 and mv.v >= coalesce(max(fv.v), 0)
       ) w
       on conflict (athlete_id, achievement_id) do nothing',
      'champ-' || ch.slug || '-' || v_pk, ch.title || ' Champion', v_pk, ch.slug, ch.metric, ch.period);
    get diagnostics v_rc = row_count; granted := granted + v_rc;
  end loop;
  return granted;
end; $$;
revoke execute on function public.settle_group_challenges() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule('settle-challenges')
  where exists (select 1 from cron.job where jobname = 'settle-challenges');
select cron.schedule('settle-challenges', '0 */6 * * *', $$select public.settle_challenges()$$);

select cron.unschedule('settle-group-challenges')
  where exists (select 1 from cron.job where jobname = 'settle-group-challenges');
select cron.schedule('settle-group-challenges', '55 23 * * 0', $$select public.settle_group_challenges()$$);
