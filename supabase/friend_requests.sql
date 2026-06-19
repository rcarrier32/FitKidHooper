-- Add-a-friend-by-username with a confirm step. Type an exact username → the
-- target gets a pending request → they accept/decline. Mutual requests
-- auto-accept. Mirrors accept_friend_invite's friendship + friends-board setup.

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.athlete_profiles(id) on delete cascade,
  target_id    uuid not null references public.athlete_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, target_id)
);

alter table public.friend_requests enable row level security;
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests for select
  using (requester_id = auth.uid() or target_id = auth.uid());
-- writes go through SECURITY DEFINER RPCs only (no insert/update policy).

-- Shared: create the symmetric friendship and cross-add both friends boards.
create or replace function public.make_friends(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ba uuid; v_bb uuid;
begin
  insert into public.friendships (athlete_a, athlete_b)
  values (least(p_a, p_b), greatest(p_a, p_b))
  on conflict do nothing;
  v_ba := public.ensure_friends_board(p_a);
  v_bb := public.ensure_friends_board(p_b);
  insert into public.board_members (board_id, athlete_id, role) values (v_ba, p_b, 'member') on conflict do nothing;
  insert into public.board_members (board_id, athlete_id, role) values (v_bb, p_a, 'member') on conflict do nothing;
end; $$;

create or replace function public.send_friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_target uuid;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'Sign in first'); end if;
  select user_id into v_target from public.auth_usernames where lower(username) = lower(trim(p_username));
  if v_target is null then return jsonb_build_object('ok', false, 'error', 'No user with that username'); end if;
  if v_target = v_me then return jsonb_build_object('ok', false, 'error', 'That''s your own username'); end if;
  if exists (select 1 from public.friendships
             where athlete_a = least(v_me, v_target) and athlete_b = greatest(v_me, v_target)) then
    return jsonb_build_object('ok', false, 'error', 'You''re already friends');
  end if;
  -- If they already requested me, accept it now (mutual).
  if exists (select 1 from public.friend_requests
             where requester_id = v_target and target_id = v_me and status = 'pending') then
    update public.friend_requests set status = 'accepted', responded_at = now()
     where requester_id = v_target and target_id = v_me and status = 'pending';
    perform public.make_friends(v_me, v_target);
    return jsonb_build_object('ok', true, 'status', 'accepted');
  end if;
  insert into public.friend_requests (requester_id, target_id, status)
  values (v_me, v_target, 'pending')
  on conflict (requester_id, target_id)
    do update set status = 'pending', created_at = now(), responded_at = null;
  return jsonb_build_object('ok', true, 'status', 'pending');
end; $$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_req public.friend_requests%rowtype;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'Sign in first'); end if;
  select * into v_req from public.friend_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Request not found'); end if;
  if v_req.target_id <> v_me then return jsonb_build_object('ok', false, 'error', 'Not your request'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', true, 'status', v_req.status); end if;
  if p_accept then
    update public.friend_requests set status = 'accepted', responded_at = now() where id = p_request_id;
    perform public.make_friends(v_me, v_req.requester_id);
    return jsonb_build_object('ok', true, 'status', 'accepted');
  else
    update public.friend_requests set status = 'declined', responded_at = now() where id = p_request_id;
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;
end; $$;

create or replace function public.list_friend_requests()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', fr.id,
    'requester_id', fr.requester_id,
    'username', un.username,
    'display_name', p.display_name,
    'created_at', fr.created_at
  ) order by fr.created_at desc), '[]'::jsonb)
  from public.friend_requests fr
  left join public.auth_usernames   un on un.user_id = fr.requester_id
  left join public.athlete_profiles p  on p.id       = fr.requester_id
  where fr.target_id = auth.uid() and fr.status = 'pending';
$$;

revoke execute on function public.make_friends(uuid, uuid) from public;
