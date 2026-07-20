-- leaderboard_privacy.sql — the leaderboard shows the username (Jersey Name),
-- never a child's real name. Applied live to jjwaspyuldkwasfyrqbw.
--
-- Why: leaderboard_stats is peer-readable (any athlete can read the rankings
-- for their age group). Storing a child's real name there is a public
-- disclosure of personal information, which pushes COPPA toward stronger
-- verifiable parental consent. Showing only a non-identifying username keeps
-- the app in the lighter email-consent tier. (Paired with the app-side guard
-- that blocks a username from containing the child's real first/last name.)
--
-- A BEFORE trigger forces display_name to the athlete's username on every
-- write, so a real name can never land in this table regardless of what the
-- client sends. Existing rows were scrubbed the same way.
--
-- NOTE: athlete_profiles.display_name still holds the real name (used for
-- friend cards + friend search). That's a separate, narrower exposure worth a
-- follow-up if you want friend search to be username-only too.

create or replace function public.leaderboard_display_as_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.display_name := coalesce(
    (select username from public.auth_usernames where user_id = new.athlete_id),
    'Hooper'
  );
  return new;
end;
$$;

drop trigger if exists leaderboard_username_only on public.leaderboard_stats;
create trigger leaderboard_username_only
  before insert or update on public.leaderboard_stats
  for each row execute function public.leaderboard_display_as_username();

-- One-time scrub of real names already stored:
update public.leaderboard_stats s
set display_name = coalesce(
  (select u.username from public.auth_usernames u where u.user_id = s.athlete_id),
  'Hooper'
);
