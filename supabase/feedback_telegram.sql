-- Telegram alerts when athletes submit bugs or feature ideas (and substantive general feedback).
-- Requires: pg_net extension, notify-telegram edge function deployed with secrets
--   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
-- Apply in Supabase SQL editor after deploying the function.

create or replace function public.notify_feedback_telegram()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notify boolean := false;
  v_title text;
begin
  if new.category in ('bug', 'feature_request') then
    v_notify := true;
  elsif new.category = 'general' and (
    new.sentiment = 'thumbs_down'
    or nullif(trim(coalesce(new.message, '')), '') is not null
  ) then
    v_notify := true;
  end if;

  if not v_notify then
    return new;
  end if;

  v_title := case new.category
    when 'bug' then 'Bug report'
    when 'feature_request' then 'Feature idea'
    else 'Feedback'
  end;

  perform net.http_post(
    url := 'https://jjwaspyuldkwasfyrqbw.supabase.co/functions/v1/notify-telegram',
    body := jsonb_build_object(
      'secret', 'fkh_notify_Tg8Kp2Qm5Wx7Nz4Rb3Yv6Hs1Ld0Ac',
      'category', new.category,
      'title', v_title,
      'message', coalesce(nullif(trim(new.message), ''), '(no message)'),
      'rating', new.rating,
      'sentiment', new.sentiment,
      'app_version', new.app_version,
      'feedback_id', new.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqd2FzcHl1bGRrd2FzZnlycWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODM3MTQsImV4cCI6MjA5NTU1OTcxNH0.zK3M7sr8ZRwEqtxM8Dc5mO0MoE1VXlaYugVDhhzOdl4'
    )
  );

  return new;
end;
$$;

drop trigger if exists feedback_telegram_notify on public.feedback;
create trigger feedback_telegram_notify
  after insert on public.feedback
  for each row execute function public.notify_feedback_telegram();
