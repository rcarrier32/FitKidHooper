-- Identity stitching: unify a kid's anonymous device history onto their auth
-- identity when they sign in. claim_device_stats already re-parents boards,
-- achievements, leaderboard standing and friendships from the device id to the
-- user id on sign-in; this adds the analytics tables (events, feedback,
-- athlete_analytics) so their stats follow them too. Client-side, analytics.js
-- logs events under the auth user id when a session exists.
CREATE OR REPLACE FUNCTION public.claim_device_stats(p_device_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_moved int := 0;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_device_id is null or p_device_id = v_user then
    return jsonb_build_object('ok', true, 'moved', 0);
  end if;

  delete from public.leaderboard_stats d
   where d.athlete_id = p_device_id
     and exists (select 1 from public.leaderboard_stats u
                 where u.athlete_id = v_user and u.period = d.period);
  update public.leaderboard_stats set athlete_id = v_user where athlete_id = p_device_id;
  get diagnostics v_moved = row_count;

  update public.boards set owner_id = v_user where owner_id = p_device_id;

  delete from public.board_members d
   where d.athlete_id = p_device_id
     and exists (select 1 from public.board_members u
                 where u.board_id = d.board_id and u.athlete_id = v_user);
  update public.board_members set athlete_id = v_user where athlete_id = p_device_id;

  -- Achievement ledger (badges, milestones, titles, cosmetics, challenge rewards).
  delete from public.athlete_achievements d
   where d.athlete_id = p_device_id
     and exists (select 1 from public.athlete_achievements u
                 where u.athlete_id = v_user and u.achievement_id = d.achievement_id);
  update public.athlete_achievements set athlete_id = v_user where athlete_id = p_device_id;

  update public.friend_invites set inviter_id = v_user where inviter_id = p_device_id;

  insert into public.friendships (athlete_a, athlete_b)
  select least(v_user, other), greatest(v_user, other)
  from (
    select case when athlete_a = p_device_id then athlete_b else athlete_a end as other
    from public.friendships
    where athlete_a = p_device_id or athlete_b = p_device_id
  ) s
  where other <> v_user
  on conflict do nothing;

  delete from public.friendships
   where athlete_a = p_device_id or athlete_b = p_device_id;

  -- Analytics identity: unify the anonymous device's history under the user.
  update public.events   set athlete_id = v_user where athlete_id = p_device_id;
  update public.feedback set athlete_id = v_user where athlete_id = p_device_id;
  delete from public.athlete_analytics d
   where d.athlete_id = p_device_id
     and exists (select 1 from public.athlete_analytics u where u.athlete_id = v_user);
  update public.athlete_analytics set athlete_id = v_user where athlete_id = p_device_id;

  return jsonb_build_object('ok', true, 'moved', v_moved);
end;
$function$;

-- One-time backfill: honor device->user links already recorded on profiles
-- (e.g. accounts that linked before analytics stitching existed).
do $$
declare r record;
begin
  for r in
    select id as user_id, legacy_device_id
    from public.athlete_profiles
    where legacy_device_id is not null and legacy_device_id <> id
  loop
    update public.events   set athlete_id = r.user_id where athlete_id = r.legacy_device_id;
    update public.feedback set athlete_id = r.user_id where athlete_id = r.legacy_device_id;
    delete from public.athlete_analytics d
     where d.athlete_id = r.legacy_device_id
       and exists (select 1 from public.athlete_analytics u where u.athlete_id = r.user_id);
    update public.athlete_analytics set athlete_id = r.user_id where athlete_id = r.legacy_device_id;
  end loop;
end $$;
