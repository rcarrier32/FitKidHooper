-- Profile avatars — public URLs for friend-visible photos (run after boards.sql)

alter table public.athlete_profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fkh-avatars',
  'fkh-avatars',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fkh_avatars_public_read" on storage.objects;
create policy "fkh_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'fkh-avatars');

-- MVP: anon upload (matches athlete_profiles open upsert pattern)
drop policy if exists "fkh_avatars_anon_insert" on storage.objects;
create policy "fkh_avatars_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'fkh-avatars');

drop policy if exists "fkh_avatars_anon_update" on storage.objects;
create policy "fkh_avatars_anon_update"
  on storage.objects for update
  using (bucket_id = 'fkh-avatars');

drop policy if exists "fkh_avatars_anon_delete" on storage.objects;
create policy "fkh_avatars_anon_delete"
  on storage.objects for delete
  using (bucket_id = 'fkh-avatars');
