-- Fit Kid Hooper — Supabase Storage for FKH original videos
-- Run after schema.sql and analytics.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fkh-videos',
  'fkh-videos',
  true,
  104857600,
  array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for app video playback
drop policy if exists "fkh_videos_public_read" on storage.objects;
create policy "fkh_videos_public_read"
  on storage.objects for select
  using (bucket_id = 'fkh-videos');

-- Dashboard uploads (authenticated Supabase users / service role)
drop policy if exists "fkh_videos_auth_upload" on storage.objects;
create policy "fkh_videos_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fkh-videos');

drop policy if exists "fkh_videos_auth_update" on storage.objects;
create policy "fkh_videos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fkh-videos');

drop policy if exists "fkh_videos_auth_delete" on storage.objects;
create policy "fkh_videos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fkh-videos');
