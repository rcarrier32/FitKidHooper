-- buddy_video_sessions.sql — Buddy Video, Phase 2: session lifecycle.
--
-- Phase 1 (buddy_video_consent.sql) established WHETHER two athletes may video
-- together. This adds the session itself: invite, accept, decline, end — and an
-- auditable record of every call that happened.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- OFF BY DEFAULT. On purpose. Read this before enabling.
--
-- Phase 1 recorded that "the VERIFICATION method (confirming it's really the
-- parent) is pending legal review before any video ships." That is still true.
-- Consent today is a parent clicking an emailed link and ticking a box, which
-- is the weakest form of verifiable parental consent there is — adequate for
-- storing training reps, not obviously adequate for letting a child open a live
-- camera to another user.
--
-- So start_video_session refuses unless private.app_config holds
-- video_sessions_enabled = 'true'. Shipping the UI cannot turn video on; a
-- human has to run the enable statement at the bottom of this file, knowingly.
-- Every other gate (mutual friendship, both parents opted in) still applies on
-- top of it — the switch only decides whether the feature exists at all.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- No recording. There is no media column here and no storage bucket: sessions
-- are peer-to-peer and nothing is captured server-side. Recording children
-- would be a separate decision with its own legal footing, not a feature to
-- add quietly later.

create table if not exists public.video_sessions (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references auth.users(id) on delete cascade,
  guest_id    uuid not null references auth.users(id) on delete cascade,
  -- inviting → active (guest accepted) → ended. declined/expired are terminal.
  status      text not null default 'inviting'
              check (status in ('inviting','active','ended','declined','expired')),
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  ended_at    timestamptz,
  -- Why the call stopped: 'hangup', 'declined', 'timeout', 'left'. Kept so a
  -- parent asking "what happened at 4pm" has an answer.
  end_reason  text,
  constraint video_sessions_distinct_parties check (host_id <> guest_id)
);

create index if not exists video_sessions_guest_pending_idx
  on public.video_sessions (guest_id, status) where status = 'inviting';
create index if not exists video_sessions_participants_idx
  on public.video_sessions (host_id, guest_id, created_at desc);

alter table public.video_sessions enable row level security;

-- Participants can read their own sessions. Nobody writes directly: every
-- mutation goes through a SECURITY DEFINER function that re-checks eligibility,
-- so the client cannot invent an 'active' session it was never granted.
drop policy if exists video_sessions_participants_read on public.video_sessions;
create policy video_sessions_participants_read on public.video_sessions
  for select using (auth.uid() = host_id or auth.uid() = guest_id);

-- ── The switch ───────────────────────────────────────────────────────────────

create or replace function public._video_sessions_enabled()
returns boolean language sql stable security definer set search_path = public, private as $$
  select coalesce(
    (select lower(value) = 'true' from private.app_config where key = 'video_sessions_enabled'),
    false
  );
$$;
revoke all on function public._video_sessions_enabled() from public;

-- Lets the client render an honest "not available yet" instead of offering a
-- button that always fails.
create or replace function public.video_sessions_available()
returns boolean language sql stable security definer set search_path = public as $$
  select public._video_sessions_enabled();
$$;
revoke all on function public.video_sessions_available() from public;
grant execute on function public.video_sessions_available() to authenticated;

-- ── Lifecycle ────────────────────────────────────────────────────────────────

-- Invite a friend to train. Re-checks the feature switch AND can_video_with, so
-- eligibility is never taken on the client's word.
create or replace function public.start_video_session(p_other uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  if not public._video_sessions_enabled() then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;
  if not public.can_video_with(p_other) then
    return jsonb_build_object('ok', false, 'error', 'not eligible');
  end if;

  -- One live session per pair. A second tap rejoins the first rather than
  -- stacking invites the guest would have to dismiss one by one.
  select id into v_id from public.video_sessions
   where status in ('inviting','active')
     and ((host_id = v_me and guest_id = p_other) or (host_id = p_other and guest_id = v_me))
   order by created_at desc limit 1;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'session_id', v_id, 'rejoined', true);
  end if;

  insert into public.video_sessions (host_id, guest_id)
  values (v_me, p_other)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'session_id', v_id, 'rejoined', false);
end;
$$;
revoke all on function public.start_video_session(uuid) from public;
grant execute on function public.start_video_session(uuid) to authenticated;

-- Guest accepts or declines. Eligibility is re-checked here too: a friendship
-- removed or a parent switching video off between invite and answer must stop
-- the call, not be papered over by a stale invite.
create or replace function public.respond_video_session(p_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_s  public.video_sessions%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  select * into v_s from public.video_sessions where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  if v_s.guest_id <> v_me then return jsonb_build_object('ok', false, 'error', 'not your invite'); end if;
  if v_s.status <> 'inviting' then
    return jsonb_build_object('ok', true, 'status', v_s.status);
  end if;

  if not p_accept then
    update public.video_sessions
       set status = 'declined', ended_at = now(), end_reason = 'declined'
     where id = p_id;
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;

  if not public._video_sessions_enabled() or not public.can_video_with(v_s.host_id) then
    update public.video_sessions
       set status = 'ended', ended_at = now(), end_reason = 'not_eligible'
     where id = p_id;
    return jsonb_build_object('ok', false, 'error', 'not eligible');
  end if;

  update public.video_sessions
     set status = 'active', started_at = now()
   where id = p_id;
  return jsonb_build_object('ok', true, 'status', 'active');
end;
$$;
revoke all on function public.respond_video_session(uuid, boolean) from public;
grant execute on function public.respond_video_session(uuid, boolean) to authenticated;

-- Either party can end, at any point, including while it is still ringing.
create or replace function public.end_video_session(p_id uuid, p_reason text default 'hangup')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_s  public.video_sessions%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  select * into v_s from public.video_sessions where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  if v_me <> v_s.host_id and v_me <> v_s.guest_id then
    return jsonb_build_object('ok', false, 'error', 'not your session');
  end if;
  if v_s.status in ('ended','declined','expired') then
    return jsonb_build_object('ok', true, 'status', v_s.status);
  end if;
  update public.video_sessions
     set status = 'ended', ended_at = now(),
         end_reason = coalesce(nullif(trim(p_reason), ''), 'hangup')
   where id = p_id;
  return jsonb_build_object('ok', true, 'status', 'ended');
end;
$$;
revoke all on function public.end_video_session(uuid, text) from public;
grant execute on function public.end_video_session(uuid, text) to authenticated;

-- Invites waiting for me. Ringing invites go stale fast — an unanswered one is
-- noise five minutes later, so only the last two minutes count as live.
create or replace function public.list_video_invites()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'session_id',   s.id,
    'host_id',      s.host_id,
    'host_name',    p.display_name,
    'host_avatar',  p.avatar_url,
    'created_at',   s.created_at
  ) order by s.created_at desc), '[]'::jsonb)
  from public.video_sessions s
  join public.athlete_profiles p on p.id = s.host_id
  where s.guest_id = auth.uid()
    and s.status = 'inviting'
    and s.created_at > now() - interval '2 minutes';
$$;
revoke all on function public.list_video_invites() from public;
grant execute on function public.list_video_invites() to authenticated;

-- Sweep invites nobody answered, so they stop showing as live.
create or replace function public.expire_stale_video_sessions()
returns integer language sql security definer set search_path = public as $$
  with done as (
    update public.video_sessions
       set status = 'expired', ended_at = now(), end_reason = 'timeout'
     where status = 'inviting' and created_at < now() - interval '2 minutes'
    returning 1
  ) select count(*)::int from done;
$$;
revoke all on function public.expire_stale_video_sessions() from public;

notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- To enable, once parent verification has cleared legal review — NOT before:
--
--   insert into private.app_config (key, value) values ('video_sessions_enabled','true')
--     on conflict (key) do update set value = excluded.value;
--
-- To switch it back off, which takes effect on the next invite:
--
--   update private.app_config set value = 'false' where key = 'video_sessions_enabled';
-- ─────────────────────────────────────────────────────────────────────────────
