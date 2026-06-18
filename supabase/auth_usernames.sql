-- Username → auth user lookup for passcode sign-in
-- Run after boards.sql in Supabase SQL Editor (or: supabase db query --file supabase/auth_usernames.sql --linked)

create table if not exists public.auth_usernames (
  username text primary key check (username ~ '^[a-z0-9_]{3,20}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists auth_usernames_lower_idx
  on public.auth_usernames (lower(username));

alter table public.auth_usernames enable row level security;

drop policy if exists "auth_usernames_select" on public.auth_usernames;
create policy "auth_usernames_select"
  on public.auth_usernames for select using (true);

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.auth_usernames
    where lower(username) = lower(trim(p_username))
  );
$$;

create or replace function public.get_email_for_username(p_username text)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  select user_id into v_user_id
  from public.auth_usernames
  where lower(username) = lower(trim(p_username));

  if v_user_id is null then
    return null;
  end if;

  select email into v_email from auth.users where id = v_user_id;
  return v_email;
end;
$$;

create or replace function public.register_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in');
  end if;

  v_norm := lower(trim(p_username));
  if v_norm !~ '^[a-z0-9_]{3,20}$' then
    return jsonb_build_object('ok', false, 'error', 'Username must be 3–20 letters, numbers, or underscores');
  end if;

  if exists (select 1 from public.auth_usernames where lower(username) = v_norm) then
    return jsonb_build_object('ok', false, 'error', 'Username is taken');
  end if;

  insert into public.auth_usernames (username, user_id)
  values (v_norm, auth.uid());

  return jsonb_build_object('ok', true, 'username', v_norm);
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
grant execute on function public.get_email_for_username(text) to anon, authenticated;
grant execute on function public.register_username(text) to authenticated;
