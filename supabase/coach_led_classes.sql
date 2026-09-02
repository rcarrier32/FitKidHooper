-- coach_led_classes.sql — Coach-led sessions: one coach on camera, athletes
-- watching and typing.
--
-- ─── Why this is not a group video call ──────────────────────────────────────
--
-- Only the coach publishes. Athletes join with canPublish=false, so no child's
-- camera or microphone ever turns on. That is a product decision with three
-- consequences worth stating, because they are the reason this table looks the
-- way it does:
--
--   1. SAFETY. Twenty children visible to each other in one room is a
--      supervision problem. Zero children visible is not. The riskiest surface
--      that remains is the chat, which is why chat is a persisted table with a
--      moderation path rather than an ephemeral data channel nobody can review.
--
--   2. CONSENT. Buddy video needs parental video consent on BOTH sides because
--      each child transmits their own camera. Watching a coach transmits
--      nothing of the child's, so it does NOT require video consent — the same
--      way watching a training video does not. What a class does expose is the
--      athlete's display name in chat, which is already visible across Squad
--      and Feed. Requiring video consent to watch would be consent theatre:
--      it would imply a risk that this design specifically removes.
--
--   3. COST. Billing is per participant-minute, and a class where everyone
--      published would fan every stream out to everyone. One publisher keeps a
--      45-minute class with twenty athletes inside the free tier.
--
-- Hosting is granted by hand, never claimed. There is no self-service path to
-- becoming a coach: an adult who can broadcast live to children is exactly the
-- role that must not be self-assigned.

-- ── Who may host ─────────────────────────────────────────────────────────────

alter table public.athlete_entitlements
  add column if not exists is_coach boolean not null default false,
  add column if not exists is_coach_at timestamptz;

create or replace function public.is_coach(p_athlete uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.athlete_entitlements
     where athlete_id = coalesce(p_athlete, auth.uid()) and is_coach
  );
$$;
revoke all on function public.is_coach(uuid) from public;
grant execute on function public.is_coach(uuid) to authenticated;

-- ── Classes ──────────────────────────────────────────────────────────────────

create table if not exists public.video_classes (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  -- scheduled → live → ended. cancelled is terminal from either of the first two.
  status       text not null default 'scheduled'
               check (status in ('scheduled','live','ended','cancelled')),
  scheduled_at timestamptz,
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz not null default now(),
  constraint video_classes_title_present check (length(trim(title)) > 0)
);

create index if not exists video_classes_live_idx
  on public.video_classes (status, scheduled_at desc);

alter table public.video_classes enable row level security;

-- Any signed-in athlete can see the schedule; that is the point of a schedule.
drop policy if exists video_classes_read on public.video_classes;
create policy video_classes_read on public.video_classes
  for select to authenticated using (status <> 'cancelled');

-- ── Chat ─────────────────────────────────────────────────────────────────────
--
-- A table, not a LiveKit data channel. Ephemeral chat cannot be reviewed after
-- the fact, and "what did someone say to my child in that class" is a question
-- a parent is entitled to have answered. Persisting it also makes deletion
-- possible, which an in-memory channel does not.

create table if not exists public.video_class_messages (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.video_classes(id) on delete cascade,
  athlete_id uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  -- Soft delete: a removed message must stay auditable, because the reason to
  -- remove one is precisely the case someone may later need to look into.
  hidden_at  timestamptz,
  hidden_by  uuid references auth.users(id) on delete set null,
  constraint video_class_messages_body_len check (length(trim(body)) between 1 and 500)
);

create index if not exists video_class_messages_class_idx
  on public.video_class_messages (class_id, created_at);

alter table public.video_class_messages enable row level security;

drop policy if exists video_class_messages_read on public.video_class_messages;
create policy video_class_messages_read on public.video_class_messages
  for select to authenticated using (hidden_at is null);

-- ── Lifecycle ────────────────────────────────────────────────────────────────

create or replace function public.create_video_class(p_title text, p_scheduled_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_id uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  if not public.is_coach(v_me) then return jsonb_build_object('ok', false, 'error', 'not a coach'); end if;
  if coalesce(trim(p_title), '') = '' then return jsonb_build_object('ok', false, 'error', 'title required'); end if;
  insert into public.video_classes (coach_id, title, scheduled_at)
  values (v_me, trim(p_title), p_scheduled_at)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'class_id', v_id);
end;
$$;
revoke all on function public.create_video_class(text, timestamptz) from public;
grant execute on function public.create_video_class(text, timestamptz) to authenticated;

create or replace function public.set_video_class_status(p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_c public.video_classes%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  select * into v_c from public.video_classes where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  if v_c.coach_id <> v_me then return jsonb_build_object('ok', false, 'error', 'not your class'); end if;
  if p_status not in ('live','ended','cancelled') then
    return jsonb_build_object('ok', false, 'error', 'bad status');
  end if;
  update public.video_classes
     set status     = p_status,
         started_at = case when p_status = 'live'  then coalesce(started_at, now()) else started_at end,
         ended_at   = case when p_status in ('ended','cancelled') then now() else ended_at end
   where id = p_id;
  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;
revoke all on function public.set_video_class_status(uuid, text) from public;
grant execute on function public.set_video_class_status(uuid, text) to authenticated;

-- What a kid opening the app should see: the class that is on right now, plus
-- what is coming. Deliberately not "every class ever".
create or replace function public.list_video_classes()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'class_id',     c.id,
    'title',        c.title,
    'status',       c.status,
    'scheduled_at', c.scheduled_at,
    'started_at',   c.started_at,
    'coach_id',     c.coach_id,
    'coach_name',   p.display_name,
    'coach_avatar', p.avatar_url
  ) order by (c.status = 'live') desc, c.scheduled_at nulls last), '[]'::jsonb)
  from public.video_classes c
  join public.athlete_profiles p on p.id = c.coach_id
  where auth.uid() is not null
    and (c.status = 'live'
         or (c.status = 'scheduled' and coalesce(c.scheduled_at, now()) > now() - interval '1 hour'));
$$;
revoke all on function public.list_video_classes() from public;
grant execute on function public.list_video_classes() to authenticated;

-- ── Chat actions ─────────────────────────────────────────────────────────────

create or replace function public.post_class_message(p_class_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_status text; v_id uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  select status into v_status from public.video_classes where id = p_class_id;
  if v_status is null then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  -- Chat is open only while the class is. A room nobody is watching is not a
  -- place children should be able to message each other unsupervised.
  if v_status <> 'live' then return jsonb_build_object('ok', false, 'error', 'class not live'); end if;
  if coalesce(trim(p_body), '') = '' then return jsonb_build_object('ok', false, 'error', 'empty'); end if;
  insert into public.video_class_messages (class_id, athlete_id, body)
  values (p_class_id, v_me, left(trim(p_body), 500))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'message_id', v_id);
end;
$$;
revoke all on function public.post_class_message(uuid, text) from public;
grant execute on function public.post_class_message(uuid, text) to authenticated;

create or replace function public.list_class_messages(p_class_id uuid, p_since timestamptz default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'message_id',  m.id,
    'athlete_id',  m.athlete_id,
    'name',        p.display_name,
    'body',        m.body,
    'created_at',  m.created_at,
    'is_coach',    (m.athlete_id = c.coach_id)
  ) order by m.created_at), '[]'::jsonb)
  from public.video_class_messages m
  join public.video_classes c on c.id = m.class_id
  join public.athlete_profiles p on p.id = m.athlete_id
  where m.class_id = p_class_id
    and m.hidden_at is null
    and auth.uid() is not null
    and (p_since is null or m.created_at > p_since);
$$;
revoke all on function public.list_class_messages(uuid, timestamptz) from public;
grant execute on function public.list_class_messages(uuid, timestamptz) to authenticated;

-- The coach moderates their own room. Soft delete only — see the table comment.
create or replace function public.hide_class_message(p_message_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_coach uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  select c.coach_id into v_coach
    from public.video_class_messages m join public.video_classes c on c.id = m.class_id
   where m.id = p_message_id;
  if v_coach is null then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  if v_coach <> v_me then return jsonb_build_object('ok', false, 'error', 'not your class'); end if;
  update public.video_class_messages
     set hidden_at = now(), hidden_by = v_me
   where id = p_message_id and hidden_at is null;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.hide_class_message(uuid) from public;
grant execute on function public.hide_class_message(uuid) to authenticated;

notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- To make someone a coach — by hand, deliberately, never self-service:
--
--   insert into public.athlete_entitlements (athlete_id, is_coach, is_coach_at)
--   values ('<athlete uuid>', true, now())
--   on conflict (athlete_id) do update set is_coach = true, is_coach_at = now();
-- ─────────────────────────────────────────────────────────────────────────────
