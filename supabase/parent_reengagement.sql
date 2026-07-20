-- parent_reengagement.sql — foundation for "your athlete hasn't trained in a
-- while" emails to consented parents. Applied live to jjwaspyuldkwasfyrqbw.
--
-- STATUS: data layer only. The actual send is NOT wired — it needs:
--   1. An email provider (Resend / SendGrid / Postmark) + API key stored as an
--      Edge Function secret (EMAIL_API_KEY). Supabase's built-in email is
--      auth-only and can't be used for this.
--   2. Real consented parents — parental_consent is empty until families sign
--      up, so there is nothing to send today.
--
-- When both exist, the sender is a thin edge function (sketch below) driven by
-- this view, ideally on a weekly pg_cron schedule with a per-parent frequency
-- cap so nobody gets nagged.

create or replace view public.parent_reengagement_queue as
select
  pc.athlete_id,
  pc.parent_email,
  ap.display_name                                       as athlete_name,
  aa.last_session_at,
  extract(day from now() - aa.last_session_at)::int     as days_inactive,
  pc.consented_at,
  pc.last_reengagement_email_at
from public.parental_consent pc
join public.athlete_profiles ap on ap.id = pc.athlete_id
left join public.athlete_analytics aa on aa.athlete_id = pc.athlete_id
where aa.last_session_at is not null
  and aa.last_session_at < now() - interval '7 days'
  -- Frequency cap: never email a parent more than once every 14 days.
  and (pc.last_reengagement_email_at is null
       or pc.last_reengagement_email_at < now() - interval '14 days')
order by aa.last_session_at asc;

-- Frequency-cap column (set by the send-parent-email edge function after a send).
alter table public.parental_consent
  add column if not exists last_reengagement_email_at timestamptz;

-- Admin-gated: inherits the admin-only RLS on parental_consent / athlete_analytics.
alter view public.parent_reengagement_queue set (security_invoker = on);

-- ── Sender: supabase/functions/send-parent-email (DEPLOYED, inert) ────
-- Gated by PUSH_SECRET. Reads RESEND_API_KEY + FKH_FROM_EMAIL from Edge
-- Function secrets; no-ops until both are set + consented parents exist.
-- Writes parental_consent.last_reengagement_email_at after each send so the
-- 14-day cap above kicks in.
--
--   const rows = await supabase.from("parent_reengagement_queue").select("*");
--   for (const r of rows) {
--     await fetch("https://api.resend.com/emails", {
--       method: "POST",
--       headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}` },
--       body: JSON.stringify({
--         to: r.parent_email,
--         subject: `${r.athlete_name} hasn't trained in ${r.days_inactive} days`,
--         html: `<p>...encouraging, parent-facing copy...</p>`,
--       }),
--     });
--   }
--
-- Add a `last_reengagement_email_at` column to parental_consent (or a small log
-- table) and skip anyone emailed in the last ~2 weeks so parents aren't nagged.

notify pgrst, 'reload schema';
