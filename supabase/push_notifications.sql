-- Web push: per-device subscriptions + category prefs, a daily reminder cron,
-- and a friend-request push trigger. The send-push edge function does the actual
-- web-push delivery (see supabase/functions/send-push). VAPID public key is also
-- in src/lib/notifications.js; the private key lives only in the edge function.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  prefs jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists push_sub_rw on public.push_subscriptions;
create policy push_sub_rw on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_prefs jsonb, p_ua text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, prefs, user_agent, updated_at)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(p_prefs, '{}'::jsonb), p_ua, now())
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth,
        prefs = excluded.prefs, user_agent = excluded.user_agent, updated_at = now();
end; $$;

create or replace function public.update_push_prefs(p_prefs jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.push_subscriptions set prefs = coalesce(p_prefs, '{}'::jsonb), updated_at = now()
  where user_id = auth.uid();
end; $$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end; $$;

-- Daily training nudge (23:00 UTC) + friend-request push are wired via pg_cron and
-- a trigger that call the send-push edge function through pg_net. See migration
-- push_cron_and_friend_trigger (cron.schedule 'fkh-daily-reminder' +
-- notify_friend_request() trigger on friend_requests).
