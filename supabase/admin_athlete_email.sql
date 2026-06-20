-- Surface each signed-in athlete's account email in the admin rollup so the
-- founder can see who signed up. SECURITY DEFINER reads auth.users; the rollup
-- stays admin-gated via the events RLS it runs under (security_invoker).
-- (Applied as migration admin_athlete_email — the athlete_rollup view definition
--  in analytics_athlete_rollup.sql also gains the `email` column.)
create or replace function public.athlete_email(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from auth.users where id = p_id;
$$;
