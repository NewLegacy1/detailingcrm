-- Storage bucket for job before/after photos (create in Dashboard if this fails)
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated upload job photos" on storage.objects;
create policy "Authenticated upload job photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos');

drop policy if exists "Authenticated read job photos" on storage.objects;
create policy "Authenticated read job photos" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos');

drop policy if exists "Authenticated delete job photos" on storage.objects;
create policy "Authenticated delete job photos" on storage.objects for delete to authenticated
  using (bucket_id = 'job-photos');
