-- class_invites.sql — Publish a class ahead of time and invite athletes to it.
--
-- A class that only exists once it is already running is a class nobody plans
-- around. This adds the part before: a coach writes what the session is, picks
-- who it is for, and those athletes get told — with the coach's own words, not
-- a generic "a class was scheduled".
--
-- The description is the point. "Tuesday Handles" tells a kid nothing;
-- "Bring a ball and something to jump over, we're working on change of pace"
-- is why they turn up. It travels with the invite into the notification.
--
-- Invites are explicit rows rather than a broadcast flag. A coach running a
-- U10 session should not be notifying the fifteen-year-olds, and an invite list
-- is also the record of who a session was intended for.

alter table public.video_classes
  add column if not exists description text;

create table if not exists public.video_class_invites (
  class_id   uuid not null references public.video_classes(id) on delete cascade,
  athlete_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  seen_at    timestamptz,
  primary key (class_id, athlete_id)
);

create index if not exists video_class_invites_athlete_idx
  on public.video_class_invites (athlete_id, created_at desc);

alter table public.video_class_invites enable row level security;

drop policy if exists video_class_invites_read on public.video_class_invites;
create policy video_class_invites_read on public.video_class_invites
  for select using (
    auth.uid() = athlete_id
    or exists (select 1 from public.video_classes c where c.id = class_id and c.coach_id = auth.uid())
  );

-- Reuses the 'challenges' notification category rather than inventing one. An
-- athlete who has switched that off is telling us they do not want to be
-- pinged about scheduled group activities, and a class is exactly that; a new
-- category would quietly re-enable itself for everyone who had already opted
-- out of the same kind of thing.
create or replace function public._push_class_invite(
  p_user_id uuid, p_title text, p_body text
) returns void language plpgsql security definer set search_path = public, private as $$
begin
  if p_user_id is null then return; end if;
  perform net.http_post(
    url := 'https://jjwaspyuldkwasfyrqbw.supabase.co/functions/v1/send-push',
    body := jsonb_build_object(
      'secret', (select value from private.app_config where key = 'push_secret'),
      'category', 'challenges',
      'onlyUserId', p_user_id,
      'title', p_title,
      'body', p_body,
      'url', '/FitKidHooper/?classes=1'
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
end; $$;
revoke all on function public._push_class_invite(uuid, text, text) from public;

-- Schedule a class. Same coach check as create_video_class, plus the parts
-- that make it plannable.
create or replace function public.schedule_video_class(
  p_title text, p_description text, p_scheduled_at timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_id uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  if not public.is_coach(v_me) then return jsonb_build_object('ok', false, 'error', 'not a coach'); end if;
  if coalesce(trim(p_title), '') = '' then return jsonb_build_object('ok', false, 'error', 'title required'); end if;
  insert into public.video_classes (coach_id, title, description, scheduled_at, status)
  values (v_me, trim(p_title), nullif(trim(p_description), ''), p_scheduled_at, 'scheduled')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'class_id', v_id);
end;
$$;
revoke all on function public.schedule_video_class(text, text, timestamptz) from public;
grant execute on function public.schedule_video_class(text, text, timestamptz) to authenticated;

-- Invite athletes, and tell them. Re-invitable without duplicating a row, but
-- an athlete already invited is NOT notified twice — a coach adding one more
-- name should not re-ping everyone who was already on the list.
create or replace function public.invite_to_class(p_class_id uuid, p_athlete_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_c  public.video_classes%rowtype;
  v_coach_name text;
  v_body text;
  v_new int := 0;
  v_id uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  select * into v_c from public.video_classes where id = p_class_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  if v_c.coach_id <> v_me then return jsonb_build_object('ok', false, 'error', 'not your class'); end if;
  if v_c.status in ('ended','cancelled') then return jsonb_build_object('ok', false, 'error', 'class is over'); end if;

  select display_name into v_coach_name from public.athlete_profiles where id = v_me;
  -- The coach's own words carry into the notification; the title alone rarely
  -- says why a kid should show up.
  v_body := coalesce(nullif(trim(v_c.description), ''), 'Tap for details');

  foreach v_id in array coalesce(p_athlete_ids, '{}')
  loop
    if v_id is not null and v_id <> v_me then
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
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'invited', v_new);
end;
$$;
revoke all on function public.invite_to_class(uuid, uuid[]) from public;
grant execute on function public.invite_to_class(uuid, uuid[]) to authenticated;

-- What is coming up for me: classes I was invited to, plus anything live now.
-- A live class is included whether or not I was invited, because a session that
-- is actually running should not be invisible to an athlete who is in the app.
create or replace function public.list_my_classes()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'status' = 'live' desc, x->>'scheduled_at'), '[]'::jsonb)
  from (
    select distinct jsonb_build_object(
      'class_id',     c.id,
      'title',        c.title,
      'description',  c.description,
      'status',       c.status,
      'scheduled_at', c.scheduled_at,
      'coach_id',     c.coach_id,
      'coach_name',   p.display_name,
      'invited',      (i.athlete_id is not null)
    ) as x
    from public.video_classes c
    join public.athlete_profiles p on p.id = c.coach_id
    left join public.video_class_invites i
      on i.class_id = c.id and i.athlete_id = auth.uid()
    where auth.uid() is not null
      and c.status in ('scheduled','live')
      and (i.athlete_id is not null or c.status = 'live' or c.coach_id = auth.uid())
      and (c.scheduled_at is null or c.scheduled_at > now() - interval '2 hours')
  ) sub;
$$;
revoke all on function public.list_my_classes() from public;
grant execute on function public.list_my_classes() to authenticated;

-- Who a coach can invite, and who is already on the list. Coach-only: this is
-- a roster, and no athlete needs to see one.
create or replace function public.list_class_invitees(p_class_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'athlete_id', p.id,
    'name',       p.display_name,
    'age_group',  p.age_group,
    'invited',    (i.athlete_id is not null)
  ) order by p.display_name), '[]'::jsonb)
  from public.athlete_profiles p
  left join public.video_class_invites i on i.class_id = p_class_id and i.athlete_id = p.id
  where exists (
    select 1 from public.video_classes c where c.id = p_class_id and c.coach_id = auth.uid()
  )
  and p.id <> auth.uid();
$$;
revoke all on function public.list_class_invitees(uuid) from public;
grant execute on function public.list_class_invitees(uuid) to authenticated;

notify pgrst, 'reload schema';
