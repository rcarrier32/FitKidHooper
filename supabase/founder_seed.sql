-- Founder auto-grant — applied live to project jjwaspyuldkwasfyrqbw.
-- On first sign-in, the founder account is automatically made a dashboard admin
-- and given the username 'dadbod'. Idempotent; safe to re-run.
--
-- This is account-specific (hardcodes the founder email) and is kept separate
-- from the reusable schema. Run after analytics.sql + boards.sql + auth_usernames.sql.

create or replace function public.handle_founder_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'rcarrier32@gmail.com' then
    insert into public.admin_allowlist (user_id, note)
    values (new.id, 'founder')
    on conflict (user_id) do nothing;

    insert into public.auth_usernames (username, user_id)
    values ('dadbod', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Trigger functions must not be exposed as REST RPC endpoints.
revoke execute on function public.handle_founder_signup() from anon, authenticated, public;

drop trigger if exists on_auth_user_created_founder on auth.users;
create trigger on_auth_user_created_founder
  after insert on auth.users
  for each row execute function public.handle_founder_signup();
