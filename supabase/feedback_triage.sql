-- Actionable feedback backlog: triage status + export-friendly views.
-- Run in Supabase SQL editor after analytics.sql.

alter table public.feedback
  add column if not exists status text not null default 'open'
    check (status in ('open', 'triaged', 'in_progress', 'done', 'wont_fix'));

alter table public.feedback
  add column if not exists admin_notes text;

alter table public.feedback
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_feedback_status_category
  on public.feedback (status, category, created_at desc);

-- Keep updated_at fresh when status/notes change.
create or replace function public.touch_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists feedback_touch_updated_at on public.feedback;
create trigger feedback_touch_updated_at
  before update on public.feedback
  for each row execute function public.touch_feedback_updated_at();

-- Admin-only status updates from dashboard / SQL / RPC.
create or replace function public.update_feedback_triage(
  p_feedback_id uuid,
  p_status text default null,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feedback%rowtype;
begin
  if not public.is_fkh_admin() then
    return jsonb_build_object('ok', false, 'error', 'admin only');
  end if;

  update public.feedback
  set
    status = coalesce(p_status, status),
    admin_notes = case
      when p_admin_notes is null then admin_notes
      when trim(p_admin_notes) = '' then null
      else trim(p_admin_notes)
    end
  where id = p_feedback_id
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'status', v_row.status,
    'admin_notes', v_row.admin_notes,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.update_feedback_triage(uuid, text, text) from public;
grant execute on function public.update_feedback_triage(uuid, text, text) to authenticated;

-- Replace views (column list changed — drop first).
drop view if exists public.feedback_open_features;
drop view if exists public.feedback_open_bugs;
drop view if exists public.feedback_backlog;
drop view if exists public.feedback_general;
drop view if exists public.feedback_bugs;
drop view if exists public.feedback_feature_requests;
drop view if exists public.feedback_summary;

-- ── Refresh category views (include triage fields) ────────────

create or replace view public.feedback_general as
select id, athlete_id, rating, sentiment, message, app_version, status, admin_notes, created_at, updated_at
from public.feedback
where category = 'general'
order by created_at desc;

create or replace view public.feedback_bugs as
select id, athlete_id, rating, sentiment, message, app_version, status, admin_notes, created_at, updated_at
from public.feedback
where category = 'bug'
order by created_at desc;

create or replace view public.feedback_feature_requests as
select id, athlete_id, rating, sentiment, message, app_version, status, admin_notes, created_at, updated_at
from public.feedback
where category = 'feature_request'
order by created_at desc;

-- Main export view: bugs + features (+ substantive general) for triage / Cursor.
create or replace view public.feedback_backlog as
select
  id,
  created_at,
  updated_at,
  category,
  status,
  rating,
  sentiment,
  left(coalesce(nullif(trim(message), ''), '(no message)'), 120) as title,
  message,
  app_version,
  athlete_id,
  admin_notes
from public.feedback
where category in ('bug', 'feature_request')
   or (category = 'general' and nullif(trim(coalesce(message, '')), '') is not null)
order by
  case status
    when 'open' then 0
    when 'triaged' then 1
    when 'in_progress' then 2
    when 'done' then 3
    when 'wont_fix' then 4
    else 5
  end,
  created_at desc;

create or replace view public.feedback_open_bugs as
select * from public.feedback_backlog
where category = 'bug' and status in ('open', 'triaged', 'in_progress')
order by created_at desc;

create or replace view public.feedback_open_features as
select * from public.feedback_backlog
where category = 'feature_request' and status in ('open', 'triaged', 'in_progress')
order by created_at desc;

create or replace view public.feedback_summary as
select
  count(*) as total,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*) filter (where sentiment = 'thumbs_up') as thumbs_up,
  count(*) filter (where sentiment = 'thumbs_down') as thumbs_down,
  count(*) filter (where category = 'feature_request') as feature_requests,
  count(*) filter (where category = 'bug') as bugs,
  count(*) filter (where category = 'general') as general,
  count(*) filter (where category = 'bug' and status in ('open', 'triaged', 'in_progress')) as open_bugs,
  count(*) filter (where category = 'feature_request' and status in ('open', 'triaged', 'in_progress')) as open_features,
  count(*) filter (where status = 'open') as open_total
from public.feedback;

alter view public.feedback_backlog          set (security_invoker = on);
alter view public.feedback_open_bugs        set (security_invoker = on);
alter view public.feedback_open_features    set (security_invoker = on);
