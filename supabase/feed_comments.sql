-- Feed v2: text comments on feed items (friend achievements). Friends-only,
-- kid-safe (≤280 chars), mirroring feed_reactions' friendship-gated RLS. A
-- trigger pushes the item owner + any @mentioned friends via the send-push
-- edge function (category friendActivity).
create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.athlete_profiles(id) on delete cascade,
  target_id uuid not null references public.athlete_profiles(id) on delete cascade,
  achievement_id text not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_item on public.feed_comments(target_id, achievement_id, created_at);

alter table public.feed_comments enable row level security;

drop policy if exists comments_insert on public.feed_comments;
create policy comments_insert on public.feed_comments for insert
  with check (author_id = auth.uid() and (target_id = auth.uid()
    or exists (select 1 from public.friendships f
               where (f.athlete_a = auth.uid() and f.athlete_b = target_id)
                  or (f.athlete_b = auth.uid() and f.athlete_a = target_id))));

drop policy if exists comments_select on public.feed_comments;
create policy comments_select on public.feed_comments for select
  using (author_id = auth.uid() or target_id = auth.uid()
    or exists (select 1 from public.friendships f
               where (f.athlete_a = auth.uid() and f.athlete_b = feed_comments.target_id)
                  or (f.athlete_b = auth.uid() and f.athlete_a = feed_comments.target_id)));

drop policy if exists comments_delete on public.feed_comments;
create policy comments_delete on public.feed_comments for delete using (author_id = auth.uid());

-- Push the item owner + any @mentioned friends when a comment lands.
create or replace function public.notify_feed_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recipients uuid[] := array[]::uuid[];
  v_author text;
  v_mention text;
  v_uid uuid;
  r uuid;
begin
  select coalesce(display_name, 'A friend') into v_author from public.athlete_profiles where id = new.author_id;
  if new.target_id <> new.author_id then v_recipients := array_append(v_recipients, new.target_id); end if;
  for v_mention in select m[1] from regexp_matches(new.body, '@([a-z0-9_]{3,20})', 'g') as m loop
    select user_id into v_uid from public.auth_usernames where lower(username) = lower(v_mention);
    if v_uid is not null and v_uid <> new.author_id and not (v_uid = any(v_recipients)) then
      v_recipients := array_append(v_recipients, v_uid);
    end if;
  end loop;
  foreach r in array v_recipients loop
    perform net.http_post(
      url := 'https://jjwaspyuldkwasfyrqbw.supabase.co/functions/v1/send-push',
      body := jsonb_build_object('secret', current_setting('app.push_secret', true),
        'category', 'friendActivity', 'onlyUserId', r,
        'title', '🏀 New comment', 'body', v_author || ' commented on the feed',
        'url', '/FitKidHooper/?view=boards'),
      headers := jsonb_build_object('Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqd2FzcHl1bGRrd2FzZnlycWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODM3MTQsImV4cCI6MjA5NTU1OTcxNH0.zK3M7sr8ZRwEqtxM8Dc5mO0MoE1VXlaYugVDhhzOdl4')
    );
  end loop;
  return new;
end; $$;

drop trigger if exists on_feed_comment_created on public.feed_comments;
create trigger on_feed_comment_created
  after insert on public.feed_comments
  for each row execute function public.notify_feed_comment();
