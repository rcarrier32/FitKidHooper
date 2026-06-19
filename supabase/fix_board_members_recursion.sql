-- board_members_select referenced board_members inside its own USING clause,
-- causing "infinite recursion detected in policy for relation board_members"
-- (broke "Sync leaderboard now" and any athlete_profiles read that checks board
-- co-membership). A SECURITY DEFINER membership check runs with RLS bypassed, so
-- the inner lookup no longer re-triggers the policy.
create or replace function public.is_board_member(p_board_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.board_members
    where board_id = p_board_id and athlete_id = p_user
  );
$$;

drop policy if exists board_members_select on public.board_members;
create policy board_members_select on public.board_members for select
  using (
    athlete_id = auth.uid()
    or public.is_board_member(board_id, auth.uid())
  );
