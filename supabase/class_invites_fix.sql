-- class_invites_fix.sql — don't offer athletes who cannot be invited, and
-- don't let one of them take down the whole batch.
--
-- Found by a coach selecting ADMIN, Matt and Braylen and getting "something
-- went wrong" for all three. ADMIN is a legacy profile with no auth.users row,
-- video_class_invites.athlete_id references auth.users, so that one insert
-- raised a foreign key violation — and because the whole function is one
-- transaction, the two valid invites rolled back with it.
--
-- Two separate faults, fixed separately:
--
--   1. The picker should never have listed ADMIN. An athlete with no account
--      cannot be notified, emailed, or join a room; offering them is offering
--      something that cannot work.
--
--   2. Even so, one unusable id must not cost the others. Invites are now
--      inserted per athlete inside an exception block, so a bad one is skipped
--      and reported rather than aborting the batch. A coach inviting twelve
--      kids should not lose eleven to one stale profile.

create or replace function public.list_class_invitees(p_class_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'athlete_id', p.id,
    'name',       p.display_name,
    'age_group',  p.age_group,
    'invited',    (i.athlete_id is not null)
  ) order by p.display_name), '[]'::jsonb)
  from public.athlete_profiles p
  -- Only real accounts. A profile with no auth.users row is a legacy
  -- device-only record: nothing can be delivered to it.
  join auth.users u on u.id = p.id
  left join public.video_class_invites i on i.class_id = p_class_id and i.athlete_id = p.id
  where exists (
    select 1 from public.video_classes c where c.id = p_class_id and c.coach_id = auth.uid()
  )
  and p.id <> auth.uid();
$$;
revoke all on function public.list_class_invitees(uuid) from public;
grant execute on function public.list_class_invitees(uuid) to authenticated;

create or replace function public.invite_to_class(p_class_id uuid, p_athlete_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_c  public.video_classes%rowtype;
  v_coach_name text;
  v_body text;
  v_new int := 0;
  v_skipped int := 0;
  v_id uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  select * into v_c from public.video_classes where id = p_class_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  if v_c.coach_id <> v_me then return jsonb_build_object('ok', false, 'error', 'not your class'); end if;
  if v_c.status in ('ended','cancelled') then return jsonb_build_object('ok', false, 'error', 'class is over'); end if;

  select display_name into v_coach_name from public.athlete_profiles where id = v_me;
  v_body := coalesce(nullif(trim(v_c.description), ''), 'Tap for details');

  foreach v_id in array coalesce(p_athlete_ids, '{}')
  loop
    if v_id is not null and v_id <> v_me then
      -- Per-athlete, so a single bad id is skipped rather than rolling back
      -- everyone else's invite alongside it.
      begin
        insert into public.video_class_invites (class_id, athlete_id)
        values (p_class_id, v_id)
        on conflict (class_id, athlete_id) do nothing;
        if found then
          v_new := v_new + 1;
          perform public._push_class_invite(
            v_id,
            coalesce(v_coach_name, 'Coach') || ': ' || v_c.title,
            v_body
          );
        end if;
      exception when others then
        -- A missing auth.users row is the known case; anything else that makes
        -- one athlete un-invitable belongs here too rather than failing the run.
        v_skipped := v_skipped + 1;
      end;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'invited', v_new, 'skipped', v_skipped);
end;
$$;
revoke all on function public.invite_to_class(uuid, uuid[]) from public;
grant execute on function public.invite_to_class(uuid, uuid[]) to authenticated;

notify pgrst, 'reload schema';
