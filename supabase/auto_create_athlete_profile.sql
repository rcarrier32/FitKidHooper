-- Social FKs (friend_invites.inviter_id, etc.) reference athlete_profiles(id),
-- but profiles were only created by a fragile client-side upsert on sign-in that
-- could silently fail — leaving signed-in users with no profile row, so
-- "Get friend code" failed with friend_invites_inviter_id_fkey. Guarantee a
-- profile for every auth user via a trigger, and backfill anyone missing one.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.athlete_profiles (id, user_id, display_name, age_group)
  values (
    new.id,
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'Athlete'),
    'unknown'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Backfill existing accounts that have no profile yet.
insert into public.athlete_profiles (id, user_id, display_name, age_group)
select u.id, u.id,
       coalesce(nullif(u.raw_user_meta_data->>'username', ''), 'Athlete'),
       'unknown'
from auth.users u
left join public.athlete_profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
