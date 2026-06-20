-- Direct friend-to-friend messages (friends-only, kid-safe).
-- Already applied on Supabase — kept in repo for reference / fresh installs.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.athlete_profiles(id) on delete cascade,
  recipient_id uuid not null references public.athlete_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_recipient_unread_idx
  on public.messages (recipient_id, read_at) where read_at is null;
create index if not exists messages_thread_idx
  on public.messages (sender_id, recipient_id, created_at desc);

alter table public.messages enable row level security;

-- Push URL uses ?messages=1 so the app opens Me → Friends → inbox.
create or replace function public.send_message(p_recipient uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_id uuid; v_text text := trim(p_body); v_sender text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'Sign in first'); end if;
  if p_recipient is null or p_recipient = v_me then return jsonb_build_object('ok', false, 'error', 'Invalid recipient'); end if;
  if v_text = '' or char_length(v_text) > 1000 then return jsonb_build_object('ok', false, 'error', 'Message empty or too long'); end if;
  if not exists (select 1 from public.friendships
                 where athlete_a = least(v_me, p_recipient) and athlete_b = greatest(v_me, p_recipient)) then
    return jsonb_build_object('ok', false, 'error', 'You can only message friends');
  end if;
  insert into public.messages (sender_id, recipient_id, body) values (v_me, p_recipient, v_text) returning id into v_id;
  select display_name into v_sender from public.athlete_profiles where id = v_me;
  perform net.http_post(
    url := 'https://jjwaspyuldkwasfyrqbw.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('secret', 'fkh_push_9Qx2Re7Yk3Lm8Wp4Zb6Td0Vn5Hs1Ac',
      'category', 'messages', 'onlyUserId', p_recipient,
      'title', '💬 ' || coalesce(v_sender, 'A friend'),
      'body', left(v_text, 80), 'url', '/FitKidHooper/?messages=1'),
    headers := jsonb_build_object('Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqd2FzcHl1bGRrd2FzZnlycWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODM3MTQsImV4cCI6MjA5NTU1OTcxNH0.zK3M7sr8ZRwEqtxM8Dc5mO0MoE1VXlaYugVDhhzOdl4'));
  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;

create or replace function public.fetch_thread(p_other uuid, p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then return '[]'::jsonb; end if;
  update public.messages set read_at = now()
    where recipient_id = v_me and sender_id = p_other and read_at is null;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'from_me', sender_id = v_me, 'body', body, 'created_at', created_at) order by created_at)
    from (
      select * from public.messages
      where (sender_id = v_me and recipient_id = p_other) or (sender_id = p_other and recipient_id = v_me)
      order by created_at desc limit p_limit
    ) m), '[]'::jsonb);
end; $$;

create or replace function public.list_message_threads()
returns jsonb language sql stable security definer set search_path = public as $$
  with pairs as (
    select case when sender_id = auth.uid() then recipient_id else sender_id end as other,
           body, created_at, recipient_id, read_at
    from public.messages where sender_id = auth.uid() or recipient_id = auth.uid()
  ),
  latest as (select distinct on (other) other, body, created_at from pairs order by other, created_at desc),
  unread as (select other, count(*) as n from pairs where recipient_id = auth.uid() and read_at is null group by other)
  select coalesce(jsonb_agg(jsonb_build_object(
    'other_id', l.other, 'username', un.username, 'name', p.display_name,
    'last', l.body, 'created_at', l.created_at, 'unread', coalesce(u.n, 0)
  ) order by l.created_at desc), '[]'::jsonb)
  from latest l
  left join unread u on u.other = l.other
  left join public.auth_usernames un on un.user_id = l.other
  left join public.athlete_profiles p on p.id = l.other;
$$;

create or replace function public.unread_message_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.messages where recipient_id = auth.uid() and read_at is null;
$$;

grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.fetch_thread(uuid, integer) to authenticated;
grant execute on function public.list_message_threads() to authenticated;
grant execute on function public.unread_message_count() to authenticated;
