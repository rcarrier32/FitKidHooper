-- Lets the parent holding a consent link delete the athlete's account outright.
--
-- A consent request is the one place we can prove an adult is on the other end,
-- so it is also the right place to offer the opposite of consent. Without this
-- the consent email had to say "reply and I'll take care of it", which puts a
-- deletion request in a human inbox and leaves the parent with no way to act.
--
-- Deliberately token-scoped rather than a general delete: the caller is
-- anonymous, and the token is the only evidence of authority. It must be
-- pending (an already-signed or expired link cannot delete) and it is consumed
-- either way, so a leaked link is single-use.

create or replace function public.delete_athlete_via_consent(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_athlete uuid;
begin
  select athlete_id into v_athlete
    from public.parent_consent_requests
   where token = p_token
     and status = 'pending'
     and expires_at > now()
   limit 1;

  if v_athlete is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Mark the request used before deleting, so a retry cannot re-run this.
  update public.parent_consent_requests
     set status = 'deleted', signed_at = now()
   where athlete_id = v_athlete;

  -- Every athlete-keyed table, enumerated from the catalogue rather than from
  -- memory. Rows left behind under a dangling id are not a deletion, and the
  -- social tables matter most: friendships, messages and requests keep a
  -- child's name visible to other children if they are missed.
  delete from public.parental_consent      where athlete_id   = v_athlete;
  delete from public.events                where athlete_id   = v_athlete;
  delete from public.athlete_analytics     where athlete_id   = v_athlete;
  delete from public.athlete_achievements  where athlete_id   = v_athlete;
  delete from public.athlete_entitlements  where athlete_id   = v_athlete;
  delete from public.benchmark_results     where athlete_id   = v_athlete;
  delete from public.board_members         where athlete_id   = v_athlete;
  delete from public.leaderboard_stats     where athlete_id   = v_athlete;
  delete from public.feedback              where athlete_id   = v_athlete;
  delete from public.friend_requests       where requester_id = v_athlete or target_id = v_athlete;
  delete from public.friendships           where athlete_a    = v_athlete or athlete_b = v_athlete;
  delete from public.messages              where sender_id    = v_athlete or recipient_id = v_athlete;
  -- Feed content was missed when this function was first written. A child's
  -- comments stay visible to other children under their name, which is
  -- exactly what the note above says must not survive a deletion.
  delete from public.feed_comments         where author_id    = v_athlete or target_id     = v_athlete;
  delete from public.feed_reactions        where actor_id     = v_athlete or target_id     = v_athlete;
  delete from public.video_sessions        where host_id      = v_athlete or guest_id     = v_athlete;
  delete from public.video_class_messages  where athlete_id   = v_athlete;
  delete from public.video_classes         where coach_id     = v_athlete;
  delete from public.drill_completions     where user_id      = v_athlete;
  delete from public.shot_log              where user_id      = v_athlete;
  delete from public.push_subscriptions    where user_id      = v_athlete;
  delete from public.athlete_save          where user_id      = v_athlete;
  delete from public.auth_usernames        where user_id      = v_athlete;
  delete from public.athlete_profiles      where id           = v_athlete;
  delete from auth.users                   where id           = v_athlete;

  return jsonb_build_object('ok', true, 'athlete_id', v_athlete);
end;
$$;

revoke all on function public.delete_athlete_via_consent(text) from public;
grant execute on function public.delete_athlete_via_consent(text) to anon, authenticated;
