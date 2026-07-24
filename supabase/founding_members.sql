-- founding_members.sql — grandfather rights for the pre-monetization cohort.
-- Applied live to jjwaspyuldkwasfyrqbw as migration `founding_member_entitlements`.
--
-- WHY NOW, with no billing built: whatever paid tier eventually ships, the
-- people who showed up first must never be asked to pay. Recording that today
-- costs one table; reconstructing "who was here before we charged" after
-- billing exists is guesswork you can't win. All 7 accounts as of 2026-07-23
-- are flagged.
--
-- Deliberately SEPARATE from athlete_profiles: entitlements are billing-adjacent
-- and must not be writable through any profile update path. No client writes at
-- all — granting an entitlement is an admin/service-role act.

create table if not exists public.athlete_entitlements (
  athlete_id         uuid primary key references auth.users(id) on delete cascade,
  founding_member    boolean not null default false,
  founding_member_at timestamptz,
  note               text,
  updated_at         timestamptz not null default now()
);

alter table public.athlete_entitlements enable row level security;

drop policy if exists athlete_entitlements_own_read on public.athlete_entitlements;
create policy athlete_entitlements_own_read on public.athlete_entitlements
  for select using (athlete_id = auth.uid());

revoke insert, update, delete on public.athlete_entitlements from anon, authenticated;

-- Backfill: everyone who had an account before monetization existed.
insert into public.athlete_entitlements (athlete_id, founding_member, founding_member_at, note)
select u.id, true, now(), 'Grandfathered: account predates any paid tier (2026-07-23 backfill)'
from auth.users u
on conflict (athlete_id) do update set
  founding_member    = true,
  founding_member_at = coalesce(public.athlete_entitlements.founding_member_at, now()),
  updated_at         = now();

-- Re-run this after any future signup wave you also want grandfathered; it is
-- idempotent and never clears an existing grant.

create or replace function public.is_founding_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.athlete_entitlements
    where athlete_id = auth.uid() and founding_member
  );
$$;
revoke all on function public.is_founding_member() from public;
grant execute on function public.is_founding_member() to authenticated;

notify pgrst, 'reload schema';
