-- buddy_video_consent.sql — Buddy Video, Phase 1: parent video consent +
-- eligibility gate. Applied live to jjwaspyuldkwasfyrqbw. NO video here — just
-- the consent record and the server-side gate a future "Train together (video)"
-- button must pass. See the Buddy Video build spec (artifact) for full context.
--
-- Video consent is a SEPARATE, explicit opt-in on top of the base account
-- consent (parental_consent). The VERIFICATION method (confirming it's really
-- the parent) is pending legal review before any video ships.

alter table public.parental_consent
  add column if not exists video_consent_at timestamptz;

-- Parent turns video training on/off for their own account. Requires an
-- existing base parental_consent row.
create or replace function public.set_video_consent(p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not signed in'); end if;
  update public.parental_consent
    set video_consent_at = case when p_on then now() else null end
    where athlete_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'no parental consent on file'); end if;
  return jsonb_build_object('ok', true, 'video', p_on);
end;
$$;
revoke all on function public.set_video_consent(boolean) from public;
grant execute on function public.set_video_consent(boolean) to authenticated;

-- Eligibility gate: can the caller video-train with p_other? True only when
-- BOTH have video consent AND they are already mutual friends. Server-side —
-- never a client-only gate.
create or replace function public.can_video_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    p_other is not null
    and p_other <> auth.uid()
    and exists (select 1 from public.parental_consent where athlete_id = auth.uid() and video_consent_at is not null)
    and exists (select 1 from public.parental_consent where athlete_id = p_other and video_consent_at is not null)
    and exists (select 1 from public.friendships
                where athlete_a = least(auth.uid(), p_other) and athlete_b = greatest(auth.uid(), p_other));
$$;
revoke all on function public.can_video_with(uuid) from public;
grant execute on function public.can_video_with(uuid) to authenticated;

-- Does the caller have video consent on? (drives the settings toggle)
create or replace function public.my_video_consent()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parental_consent where athlete_id = auth.uid() and video_consent_at is not null);
$$;
revoke all on function public.my_video_consent() from public;
grant execute on function public.my_video_consent() to authenticated;

notify pgrst, 'reload schema';
