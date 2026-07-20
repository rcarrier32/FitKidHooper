-- push_secret_store.sql — where the rotated PUSH_SECRET lives on the DB side.
--
-- The SQL callers (send_message, notify_feed_comment, notify_friend_request,
-- and the fkh-daily-reminder cron job) authenticate to the send-push edge
-- function with a shared secret. That secret used to be hardcoded in source
-- (and leaked in the public repo). It now lives in a private table that is NOT
-- exposed to the API, read only by the SECURITY DEFINER callers.
--
-- The edge function holds the same value as a Supabase Edge Function secret
-- (PUSH_SECRET); the two must match. To rotate: set both sides to a new value.
--
-- NOTE: the actual secret VALUE is never committed. Set it directly:
--   insert into private.app_config (key, value)
--   values ('push_secret', '<new-secret>')
--   on conflict (key) do update set value = excluded.value;

create schema if not exists private;

create table if not exists private.app_config (
  key   text primary key,
  value text not null
);

-- `private` is not in the PostgREST exposed schemas, so anon/authenticated
-- cannot reach this table. SECURITY DEFINER functions (owned by postgres) read
-- it via an explicit schema reference:
--   (select value from private.app_config where key = 'push_secret')
