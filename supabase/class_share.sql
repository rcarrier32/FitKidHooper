-- class_share.sql — Open a class from a link, and email an invite.
--
-- Two ways to reach a kid who is not staring at the app: a link the coach can
-- paste anywhere, and an email to the address already on file.
--
-- The link carries the class id and nothing else. It is not a capability:
-- following it still requires signing in, and joining the room still requires
-- a token from the edge function, which re-checks every rule. A stranger with
-- the link learns nothing and can join nothing.

-- One class by id, for the ?class= deep link. Readable by any signed-in
-- athlete because the schedule is not a secret — the room is what is guarded.
create or replace function public.get_video_class(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else
    (select jsonb_build_object(
      'class_id',     c.id,
      'title',        c.title,
      'description',  c.description,
      'status',       c.status,
      'scheduled_at', c.scheduled_at,
      'coach_id',     c.coach_id,
      'coach_name',   p.display_name,
      'invited',      exists (
        select 1 from public.video_class_invites i
         where i.class_id = c.id and i.athlete_id = auth.uid()
      )
    )
    from public.video_classes c
    join public.athlete_profiles p on p.id = c.coach_id
    where c.id = p_id and c.status <> 'cancelled')
  end;
$$;
revoke all on function public.get_video_class(uuid) from public;
grant execute on function public.get_video_class(uuid) to authenticated;

-- Used by the send-class-invite edge function to answer one question before it
-- sends anything: is this caller really the coach of this class? The function
-- runs as the caller, so this cannot be spoofed by passing someone else's id.
create or replace function public.i_coach_this_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.video_classes
     where id = p_class_id and coach_id = auth.uid()
  );
$$;
revoke all on function public.i_coach_this_class(uuid) from public;
grant execute on function public.i_coach_this_class(uuid) to authenticated;

notify pgrst, 'reload schema';
