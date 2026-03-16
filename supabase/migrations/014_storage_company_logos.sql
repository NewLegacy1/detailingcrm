-- Storage bucket for company/profile logo uploads
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Users can upload only to path starting with their auth.uid()
drop policy if exists "Users upload own logo" on storage.objects;
create policy "Users upload own logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Public read company logos" on storage.objects;
create policy "Public read company logos" on storage.objects for select to public
  using (bucket_id = 'company-logos');

drop policy if exists "Users update own logo" on storage.objects;
create policy "Users update own logo" on storage.objects for update to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own logo" on storage.objects;
create policy "Users delete own logo" on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text);
