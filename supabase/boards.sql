-- Fit Kid Hooper — Boards, cloud save, identity extensions
-- Run after schema.sql and analytics.sql in Supabase SQL Editor.
-- Enable Email auth in Supabase Dashboard → Authentication → Providers.

-- ── Identity extensions ─────────────────────────────────────────
alter table public.athlete_profiles
  add column if not exists jersey_number smallint check (jersey_number >= 0 and jersey_number <= 99),
  add column if not exists favorite_player text,
  add column if not exists position text check (position in ('guard', 'wing', 'post', 'any')),
  add column if not exists legacy_device_id uuid,
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_athlete_profiles_user_id
  on public.athlete_profiles(user_id) where user_id is not null;

-- ── Cloud save (one row per authenticated user) ─────────────────
create table if not exists public.athlete_save (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.athlete_save enable row level security;

drop policy if exists "athlete_save_own" on public.athlete_save;
create policy "athlete_save_own"
  on public.athlete_save for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Boards (friends + future teams) ─────────────────────────────
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('friends', 'team')),
  owner_id uuid references public.athlete_profiles(id) on delete cascade,
  name text not null default 'Friends',
  created_at timestamptz not null default now()
);

create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'owner')),
  joined_at timestamptz not null default now(),
  primary key (board_id, athlete_id)
);

create table if not exists public.friend_invites (
  code text primary key,
  inviter_id uuid not null references public.athlete_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  athlete_a uuid not null references public.athlete_profiles(id) on delete cascade,
  athlete_b uuid not null references public.athlete_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (athlete_a, athlete_b),
  check (athlete_a < athlete_b)
);

create index if not exists idx_board_members_athlete on public.board_members(athlete_id);
create index if not exists idx_friend_invites_inviter on public.friend_invites(inviter_id);

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.friend_invites enable row level security;
alter table public.friendships enable row level security;

-- Boards: members can read their boards
drop policy if exists "boards_member_select" on public.boards;
create policy "boards_member_select"
  on public.boards for select
  using (
    exists (
      select 1 from public.board_members bm
      where bm.board_id = boards.id and bm.athlete_id = auth.uid()
    )
    or owner_id = auth.uid()
  );

drop policy if exists "boards_owner_insert" on public.boards;
create policy "boards_owner_insert"
  on public.boards for insert
  with check (owner_id = auth.uid());

drop policy if exists "board_members_select" on public.board_members;
create policy "board_members_select"
  on public.board_members for select
  using (
    athlete_id = auth.uid()
    or exists (
      select 1 from public.board_members bm
      where bm.board_id = board_members.board_id and bm.athlete_id = auth.uid()
    )
  );

drop policy if exists "board_members_insert" on public.board_members;
create policy "board_members_insert"
  on public.board_members for insert
  with check (athlete_id = auth.uid() or auth.uid() in (
    select owner_id from public.boards where id = board_id
  ));

-- Friend invites: inviter manages. Accepting goes through the accept_friend_invite()
-- SECURITY DEFINER RPC, so clients never select this table by code — reads are
-- scoped to the inviter's own invites (codes must not be world-enumerable).
drop policy if exists "friend_invites_select" on public.friend_invites;
create policy "friend_invites_select"
  on public.friend_invites for select using (inviter_id = auth.uid());

drop policy if exists "friend_invites_insert" on public.friend_invites;
create policy "friend_invites_insert"
  on public.friend_invites for insert
  with check (inviter_id = auth.uid());

drop policy if exists "friend_invites_update" on public.friend_invites;
create policy "friend_invites_update"
  on public.friend_invites for update
  using (inviter_id = auth.uid() or auth.role() = 'authenticated');

drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select"
  on public.friendships for select
  using (athlete_a = auth.uid() or athlete_b = auth.uid());

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert"
  on public.friendships for insert
  with check (athlete_a = auth.uid() or athlete_b = auth.uid());

-- ── Tighten leaderboard writes (authenticated athletes only) ────
drop policy if exists "leaderboard_stats_upsert" on public.leaderboard_stats;
create policy "leaderboard_stats_upsert"
  on public.leaderboard_stats for insert
  with check (athlete_id = auth.uid() or auth.uid() is null);

drop policy if exists "leaderboard_stats_update" on public.leaderboard_stats;
create policy "leaderboard_stats_update"
  on public.leaderboard_stats for update
  using (athlete_id = auth.uid() or auth.uid() is null)
  with check (athlete_id = auth.uid() or auth.uid() is null);

drop policy if exists "athlete_profiles_upsert" on public.athlete_profiles;
create policy "athlete_profiles_insert"
  on public.athlete_profiles for insert
  with check (id = auth.uid() or auth.uid() is null);

drop policy if exists "athlete_profiles_update" on public.athlete_profiles;
create policy "athlete_profiles_update"
  on public.athlete_profiles for update
  using (id = auth.uid() or user_id = auth.uid() or auth.uid() is null)
  with check (id = auth.uid() or user_id = auth.uid() or auth.uid() is null);

-- Restrict profile reads: a minor's date_of_birth must not be world-readable.
-- Boards/leaderboards read denormalized name + stats from leaderboard_stats,
-- so a profile is only visible to the athlete, their friends, or co-board members.
drop policy if exists "athlete_profiles_select" on public.athlete_profiles;
create policy "athlete_profiles_select"
  on public.athlete_profiles for select
  using (
    id = auth.uid()
    or user_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where (f.athlete_a = auth.uid() and f.athlete_b = athlete_profiles.id)
         or (f.athlete_b = auth.uid() and f.athlete_a = athlete_profiles.id)
    )
    or exists (
      select 1
      from public.board_members m_self
      join public.board_members m_other on m_self.board_id = m_other.board_id
      where m_self.athlete_id = auth.uid()
        and m_other.athlete_id = athlete_profiles.id
    )
  );

-- ── Helpers ─────────────────────────────────────────────────────
create or replace function public.ensure_friends_board(p_athlete_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
begin
  select b.id into v_board_id
  from public.boards b
  where b.type = 'friends' and b.owner_id = p_athlete_id
  limit 1;

  if v_board_id is null then
    insert into public.boards (type, owner_id, name)
    values ('friends', p_athlete_id, 'Friends')
    returning id into v_board_id;

    insert into public.board_members (board_id, athlete_id, role)
    values (v_board_id, p_athlete_id, 'owner')
    on conflict do nothing;
  end if;

  return v_board_id;
end;
$$;

create or replace function public.accept_friend_invite(p_code text, p_accepter_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.friend_invites%rowtype;
  v_a uuid;
  v_b uuid;
  v_board_inviter uuid;
  v_board_accepter uuid;
begin
  select * into v_inv from public.friend_invites
  where code = upper(p_code) and status = 'pending' and expires_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid or expired code');
  end if;

  if v_inv.inviter_id = p_accepter_id then
    return jsonb_build_object('ok', false, 'error', 'Cannot add yourself');
  end if;

  v_a := least(v_inv.inviter_id, p_accepter_id);
  v_b := greatest(v_inv.inviter_id, p_accepter_id);

  insert into public.friendships (athlete_a, athlete_b) values (v_a, v_b)
  on conflict do nothing;

  v_board_inviter := public.ensure_friends_board(v_inv.inviter_id);
  v_board_accepter := public.ensure_friends_board(p_accepter_id);

  insert into public.board_members (board_id, athlete_id, role)
  values (v_board_inviter, p_accepter_id, 'member')
  on conflict do nothing;

  insert into public.board_members (board_id, athlete_id, role)
  values (v_board_accepter, v_inv.inviter_id, 'member')
  on conflict do nothing;

  update public.friend_invites set status = 'accepted' where code = v_inv.code;

  return jsonb_build_object('ok', true, 'friend_id', v_inv.inviter_id);
end;
$$;

-- ── Device → user migration ─────────────────────────────────────
-- Called once on first sign-in (see linkDeviceProfileOnAuth). Re-parents all
-- device-keyed board data onto the authenticated user id, so the athlete keeps
-- their leaderboard standing, friends, boards, and invites. Idempotent and
-- collision-safe (drops device rows that would duplicate existing user rows).
create or replace function public.claim_device_stats(p_device_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_moved int := 0;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_device_id is null or p_device_id = v_user then
    return jsonb_build_object('ok', true, 'moved', 0);
  end if;

  -- Leaderboard stats: drop device rows that collide on period, move the rest.
  delete from public.leaderboard_stats d
   where d.athlete_id = p_device_id
     and exists (
       select 1 from public.leaderboard_stats u
       where u.athlete_id = v_user and u.period = d.period
     );
  update public.leaderboard_stats
     set athlete_id = v_user
   where athlete_id = p_device_id;
  get diagnostics v_moved = row_count;

  -- Board ownership + membership.
  update public.boards set owner_id = v_user where owner_id = p_device_id;

  delete from public.board_members d
   where d.athlete_id = p_device_id
     and exists (
       select 1 from public.board_members u
       where u.board_id = d.board_id and u.athlete_id = v_user
     );
  update public.board_members
     set athlete_id = v_user
   where athlete_id = p_device_id;

  -- Friend invites created while anonymous.
  update public.friend_invites set inviter_id = v_user where inviter_id = p_device_id;

  -- Friendships: re-normalize (athlete_a < athlete_b), drop self/duplicate pairs.
  insert into public.friendships (athlete_a, athlete_b)
  select least(v_user, other), greatest(v_user, other)
  from (
    select case when athlete_a = p_device_id then athlete_b else athlete_a end as other
    from public.friendships
    where athlete_a = p_device_id or athlete_b = p_device_id
  ) s
  where other <> v_user
  on conflict do nothing;

  delete from public.friendships
   where athlete_a = p_device_id or athlete_b = p_device_id;

  return jsonb_build_object('ok', true, 'moved', v_moved);
end;
$$;

-- ── Function execute grants ─────────────────────────────────────
-- These SECURITY DEFINER helpers are only called by signed-in clients. Revoke the
-- implicit PUBLIC grant (which would let anon call them) and grant authenticated.
revoke execute on function public.ensure_friends_board(uuid) from public;
revoke execute on function public.claim_device_stats(uuid) from public;
grant execute on function public.ensure_friends_board(uuid) to authenticated;
grant execute on function public.claim_device_stats(uuid) to authenticated;
