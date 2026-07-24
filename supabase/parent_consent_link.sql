-- parent_consent_link.sql — the emailed parent consent signing link.
-- Applied live to jjwaspyuldkwasfyrqbw as migration `parent_consent_signing_link`.
--
-- WHY THIS SHAPE: a kid gets a grown-up's attention roughly once, so the whole
-- flow is ONE link — the athlete mints it, hands it off (mail app, text, copied
-- link), and the parent signs on their OWN device. Approval never happens in the
-- kid's hands.
--
-- The page asks two INDEPENDENT questions, and that separation is the point:
--   1. account consent  — required
--   2. video workouts   — OPTIONAL, defaults off, declining changes nothing
-- COPPA consent must be specific to each practice, so these can never collapse
-- into a single "I agree". They are separate columns and separate timestamps
-- (parental_consent.consented_at vs .video_consent_at).
--
-- The video checkbox only records INTENT — video still requires video_verified_at
-- (see buddy_video_consent.sql) before any camera turns on. An emailed link
-- proves control of an inbox, not that the signer is an adult; the stronger
-- signal (Legends roster match / human confirm) is what actually unlocks video.
--
-- SECURITY: RLS is on with NO policies. Every access goes through the SECURITY
-- DEFINER functions below, so the 64-hex token is the only key and nothing else
-- about the athlete is browsable.

create table if not exists public.parent_consent_requests (
  token               text primary key,
  athlete_id          uuid not null references auth.users(id) on delete cascade,
  status              text not null default 'pending',
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null default now() + interval '30 days',
  signed_at           timestamptz,
  parent_name         text,
  parent_relationship text,
  parent_email        text,
  video_opt_in        boolean not null default false,
  signed_user_agent   text
);

create index if not exists parent_consent_requests_athlete_idx
  on public.parent_consent_requests (athlete_id, status);

alter table public.parent_consent_requests enable row level security;
revoke all on table public.parent_consent_requests from anon, authenticated;

-- Athlete mints a link. Reuses the live pending token so re-sending never
-- invalidates a link the parent may already have open.
create or replace function public.create_consent_request()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;

  select token into v_token
    from public.parent_consent_requests
    where athlete_id = v_uid and status = 'pending' and expires_at > now()
    order by created_at desc limit 1;

  if v_token is null then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.parent_consent_requests (token, athlete_id) values (v_token, v_uid);
  end if;

  return jsonb_build_object('ok', true, 'token', v_token);
end;
$$;

-- Anon read by token. Returns the athlete's FIRST NAME only, derived server-side
-- so a stray link discloses as little as possible and a kid can't inject
-- arbitrary text into a parent-facing page.
create or replace function public.get_consent_request(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; v_label text;
begin
  select * into r from public.parent_consent_requests where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.expires_at <= now() and r.status = 'pending' then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select nullif(trim(coalesce(p.first_name, p.display_name)), '')
    into v_label from public.athlete_profiles p where p.user_id = r.athlete_id;

  return jsonb_build_object(
    'ok', true,
    'status', r.status,
    'athlete_label', coalesce(v_label, 'your athlete'),
    'video_opt_in', r.video_opt_in,
    'signed_at', r.signed_at
  );
end;
$$;

-- Anon write by token: records the signed consent.
create or replace function public.submit_parent_consent(
  p_token text,
  p_parent_name text,
  p_relationship text,
  p_parent_email text,
  p_video_opt_in boolean default false,
  p_consent_version text default '2026-07-17',
  p_user_agent text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.parent_consent_requests where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status = 'signed' then return jsonb_build_object('ok', true, 'already', true); end if;
  if r.expires_at <= now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;

  if coalesce(trim(p_parent_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;
  if coalesce(trim(p_parent_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'email_required');
  end if;

  insert into public.parental_consent
    (athlete_id, parent_email, consent_version, method, consented_at, updated_at, video_consent_at)
  values
    (r.athlete_id, trim(p_parent_email), p_consent_version, 'parent_signed_link', now(), now(),
     case when p_video_opt_in then now() else null end)
  on conflict (athlete_id) do update set
    parent_email    = excluded.parent_email,
    consent_version = excluded.consent_version,
    method          = excluded.method,
    updated_at      = now(),
    -- only ever ADDS video consent here; clearing it stays a deliberate act in Settings
    video_consent_at = case when p_video_opt_in then now()
                            else public.parental_consent.video_consent_at end;

  update public.parent_consent_requests set
    status = 'signed', signed_at = now(),
    parent_name = trim(p_parent_name),
    parent_relationship = nullif(trim(p_relationship), ''),
    parent_email = trim(p_parent_email),
    video_opt_in = coalesce(p_video_opt_in, false),
    signed_user_agent = left(coalesce(p_user_agent, ''), 300)
  where token = p_token;

  return jsonb_build_object('ok', true, 'video', coalesce(p_video_opt_in, false));
end;
$$;

revoke all on function public.create_consent_request() from public;
grant execute on function public.create_consent_request() to authenticated;

revoke all on function public.get_consent_request(text) from public;
grant execute on function public.get_consent_request(text) to anon, authenticated;

revoke all on function public.submit_parent_consent(text, text, text, text, boolean, text, text) from public;
grant execute on function public.submit_parent_consent(text, text, text, text, boolean, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
