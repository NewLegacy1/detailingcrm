-- Storage bucket for service photos (catalog images)
insert into storage.buckets (id, name, public)
values ('service-photos', 'service-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated upload service photos" on storage.objects;
create policy "Authenticated upload service photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'service-photos');

drop policy if exists "Public read service photos" on storage.objects;
create policy "Public read service photos" on storage.objects for select to public
  using (bucket_id = 'service-photos');

drop policy if exists "Authenticated delete service photos" on storage.objects;
create policy "Authenticated delete service photos" on storage.objects for delete to authenticated
  using (bucket_id = 'service-photos');
