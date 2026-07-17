-- parental_consent.sql — COPPA consent record for required registration.
-- Run in the Supabase SQL editor after schema.sql + analytics.sql.
--
-- One row per account (auth user), written at the parent step of onboarding
-- once the parent's email is verified. This is the *evidence* that consent was
-- given — kept explicitly, not inferred from the account existing.
--
-- COPPA note: parent_email is an ADULT's email (the consenting parent/guardian),
-- captured with an explicit checkbox. No child email or child PII lives here.
-- Idempotent and additive. Safe to re-run.

create table if not exists public.parental_consent (
  athlete_id      uuid primary key references auth.users(id) on delete cascade,
  parent_email    text not null,
  consent_version text not null,                       -- which policy text they agreed to
  method          text not null default 'email_verification',
  consented_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_parental_consent_consented
  on public.parental_consent (consented_at desc);

alter table public.parental_consent enable row level security;

-- An athlete may read/write only their OWN consent row; admins read all
-- (the product dashboard shows consent status). No public read.
drop policy if exists "parental_consent_select" on public.parental_consent;
create policy "parental_consent_select" on public.parental_consent
  for select using (athlete_id = auth.uid() or public.is_fkh_admin());

drop policy if exists "parental_consent_write_own" on public.parental_consent;
create policy "parental_consent_write_own" on public.parental_consent
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Keep updated_at fresh on any change.
create or replace function public.touch_parental_consent_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists parental_consent_touch on public.parental_consent;
create trigger parental_consent_touch
  before update on public.parental_consent
  for each row execute function public.touch_parental_consent_updated_at();

-- Write path: the client calls this right after the parent's email is verified.
-- security definer so the row is stamped server-side (auth.uid(), now()), but it
-- can only ever write the caller's own row — no way to record consent for someone else.
create or replace function public.record_parental_consent(
  p_parent_email text,
  p_consent_version text,
  p_method text default 'email_verification'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not signed in');
  end if;
  if p_parent_email is null or position('@' in p_parent_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'valid parent email required');
  end if;
  if p_consent_version is null or trim(p_consent_version) = '' then
    return jsonb_build_object('ok', false, 'error', 'consent version required');
  end if;

  insert into public.parental_consent (athlete_id, parent_email, consent_version, method)
  values (v_uid, lower(trim(p_parent_email)), trim(p_consent_version), coalesce(nullif(trim(p_method), ''), 'email_verification'))
  on conflict (athlete_id) do update
    set parent_email    = excluded.parent_email,
        consent_version = excluded.consent_version,
        method          = excluded.method,
        consented_at    = now();

  return jsonb_build_object('ok', true, 'athlete_id', v_uid, 'consented_at', now());
end;
$$;

revoke all on function public.record_parental_consent(text, text, text) from public;
grant execute on function public.record_parental_consent(text, text, text) to authenticated;

-- Admin dashboard: consent status per account (who's covered, who isn't).
create or replace view public.athlete_consent_status as
select
  p.id                                              as athlete_id,
  p.display_name,
  c.parent_email,
  c.consented_at,
  c.consent_version,
  (c.athlete_id is not null)                        as has_consent
from public.athlete_profiles p
left join public.parental_consent c on c.athlete_id = p.id;

alter view public.athlete_consent_status set (security_invoker = on);

notify pgrst, 'reload schema';
