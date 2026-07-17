-- Friend search by name/username + push notifications for requests and responses.
-- Apply on Supabase after friend_requests.sql.

alter table public.athlete_profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

create index if not exists athlete_profiles_first_name_idx
  on public.athlete_profiles (lower(first_name)) where first_name is not null;
create index if not exists athlete_profiles_last_name_idx
  on public.athlete_profiles (lower(last_name)) where last_name is not null;

-- Internal push helper (same pattern as messages.sql).
create or replace function public._push_friend_notification(
  p_user_id uuid, p_title text, p_body text, p_url text default '/FitKidHooper/?friends=1'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null then return; end if;
  perform net.http_post(
    url := 'https://jjwaspyuldkwasfyrqbw.supabase.co/functions/v1/send-push',
    body := jsonb_build_object(
      'secret', current_setting('app.push_secret', true),
      'category', 'friendRequest',
      'onlyUserId', p_user_id,
      'title', p_title,
      'body', p_body,
      'url', p_url
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqd2FzcHl1bGRrd2FzZnlycWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODM3MTQsImV4cCI6MjA5NTU1OTcxNH0.zK3M7sr8ZRwEqtxM8Dc5mO0MoE1VXlaYugVDhhzOdl4'
    )
  );
end; $$;

create or replace function public._send_friend_request_core(v_me uuid, v_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'Sign in first'); end if;
  if v_target is null or v_target = v_me then return jsonb_build_object('ok', false, 'error', 'Invalid user'); end if;
  if not exists (select 1 from public.athlete_profiles where id = v_target) then
    return jsonb_build_object('ok', false, 'error', 'User not found');
  end if;
  if exists (select 1 from public.friendships
             where athlete_a = least(v_me, v_target) and athlete_b = greatest(v_me, v_target)) then
    return jsonb_build_object('ok', false, 'error', 'You''re already friends');
  end if;
  if exists (select 1 from public.friend_requests
             where requester_id = v_target and target_id = v_me and status = 'pending') then
    update public.friend_requests set status = 'accepted', responded_at = now()
     where requester_id = v_target and target_id = v_me and status = 'pending';
    perform public.make_friends(v_me, v_target);
    select display_name into v_name from public.athlete_profiles where id = v_me;
    perform public._push_friend_notification(
      v_target,
      '🎉 Friend added!',
      coalesce(v_name, 'They') || ' accepted your friend request'
    );
    return jsonb_build_object('ok', true, 'status', 'accepted');
  end if;
  insert into public.friend_requests (requester_id, target_id, status)
  values (v_me, v_target, 'pending')
  on conflict (requester_id, target_id)
    do update set status = 'pending', created_at = now(), responded_at = null
    where public.friend_requests.status <> 'pending';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request already pending');
  end if;
  select display_name into v_name from public.athlete_profiles where id = v_me;
  perform public._push_friend_notification(
    v_target,
    '👋 Friend request',
    coalesce(v_name, 'Someone') || ' wants to add you'
  );
  return jsonb_build_object('ok', true, 'status', 'pending');
end; $$;

create or replace function public.send_friend_request(p_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_target uuid;
begin
  select user_id into v_target from public.auth_usernames where lower(username) = lower(trim(p_username));
  if v_target is null then return jsonb_build_object('ok', false, 'error', 'No user with that username'); end if;
  if v_target = v_me then return jsonb_build_object('ok', false, 'error', 'That''s your own username'); end if;
  return public._send_friend_request_core(v_me, v_target);
end; $$;

create or replace function public.send_friend_request_to(p_target_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return public._send_friend_request_core(auth.uid(), p_target_id);
end; $$;

create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_req public.friend_requests%rowtype;
  v_name text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'Sign in first'); end if;
  select * into v_req from public.friend_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Request not found'); end if;
  if v_req.target_id <> v_me then return jsonb_build_object('ok', false, 'error', 'Not your request'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', true, 'status', v_req.status); end if;
  select display_name into v_name from public.athlete_profiles where id = v_me;
  if p_accept then
    update public.friend_requests set status = 'accepted', responded_at = now() where id = p_request_id;
    perform public.make_friends(v_me, v_req.requester_id);
    perform public._push_friend_notification(
      v_req.requester_id,
      '🎉 Friend added!',
      coalesce(v_name, 'They') || ' accepted your friend request'
    );
    return jsonb_build_object('ok', true, 'status', 'accepted');
  else
    update public.friend_requests set status = 'declined', responded_at = now() where id = p_request_id;
    perform public._push_friend_notification(
      v_req.requester_id,
      'Friend request',
      coalesce(v_name, 'They') || ' declined your friend request'
    );
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;
end; $$;

create or replace function public.search_athletes_for_friend(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_q text := lower(trim(p_query));
  v_like text;
begin
  if v_me is null then return '[]'::jsonb; end if;
  if char_length(v_q) < 2 then return '[]'::jsonb; end if;
  v_like := '%' || v_q || '%';

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', sub.user_id,
      'username', sub.username,
      'display_name', sub.display_name,
      'avatar_url', sub.avatar_url
    ) order by sub.sort_key, sub.username)
    from (
      select
        ap.id as user_id,
        un.username,
        ap.display_name,
        ap.avatar_url,
        case
          when lower(un.username) = v_q then '0'
          when lower(un.username) like v_q || '%' then '1'
          when lower(coalesce(ap.first_name, '')) like v_q || '%' then '2'
          when lower(coalesce(ap.last_name, '')) like v_q || '%' then '2'
          else '3'
        end as sort_key
      from public.athlete_profiles ap
      inner join public.auth_usernames un on un.user_id = ap.id
      where ap.id <> v_me
        and (
          lower(un.username) like v_like
          or lower(coalesce(ap.first_name, '')) like v_like
          or lower(coalesce(ap.last_name, '')) like v_like
          or lower(coalesce(ap.display_name, '')) like v_like
        )
        and not exists (
          select 1 from public.friendships f
          where f.athlete_a = least(v_me, ap.id) and f.athlete_b = greatest(v_me, ap.id)
        )
        and not exists (
          select 1 from public.friend_requests fr
          where fr.requester_id = v_me and fr.target_id = ap.id and fr.status = 'pending'
        )
      limit 12
    ) sub
  ), '[]'::jsonb);
end; $$;

create or replace function public.list_sent_friend_requests()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', fr.id,
    'target_id', fr.target_id,
    'username', un.username,
    'display_name', p.display_name,
    'status', fr.status,
    'created_at', fr.created_at,
    'responded_at', fr.responded_at
  ) order by fr.created_at desc), '[]'::jsonb)
  from public.friend_requests fr
  left join public.auth_usernames   un on un.user_id = fr.target_id
  left join public.athlete_profiles p  on p.id       = fr.target_id
  where fr.requester_id = auth.uid()
    and (fr.status = 'pending' or fr.responded_at > now() - interval '30 days');
$$;

revoke execute on function public._push_friend_notification(uuid, text, text, text) from public;
revoke execute on function public._send_friend_request_core(uuid, uuid) from public;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.send_friend_request_to(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.search_athletes_for_friend(text) to authenticated;
grant execute on function public.list_sent_friend_requests() to authenticated;
