-- Detailing CRM: replace agency roles with detailing roles
-- Roles: pending, owner, admin, technician

-- 1. Migrate existing profile roles to new set
update public.profiles
set role = case
  when role = 'owner' then 'owner'
  when role = 'account_manager' then 'admin'
  when role in ('closer', 'media_buyer', 'cold_caller', 'demo') then 'technician'
  else 'pending'
end
where role in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo');

-- 2. Drop old check and add new one
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('pending', 'owner', 'admin', 'technician'));

-- 3. RLS: clients — owner, admin, technician can all access
drop policy if exists "Clients all authenticated" on public.clients;
drop policy if exists "Account managers read clients" on public.clients;
drop policy if exists "Clients detailing roles" on public.clients;
create policy "Clients detailing roles" on public.clients for all
  using (public.get_user_role() in ('owner', 'admin', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'technician'));

-- 4. Invoices — owner and admin
drop policy if exists "Invoices owner account_manager" on public.invoices;
drop policy if exists "Invoices owner admin" on public.invoices;
create policy "Invoices owner admin" on public.invoices for all
  using (public.get_user_role() in ('owner', 'admin'))
  with check (public.get_user_role() in ('owner', 'admin'));

-- 5. Vehicles, services, jobs, job_photos — owner, admin, technician
drop policy if exists "vehicles_all_authenticated" on public.vehicles;
drop policy if exists "vehicles_detailing_roles" on public.vehicles;
create policy "vehicles_detailing_roles" on public.vehicles for all
  using (public.get_user_role() in ('owner', 'admin', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'technician'));

drop policy if exists "services_all_authenticated" on public.services;
drop policy if exists "services_detailing_roles" on public.services;
create policy "services_detailing_roles" on public.services for all
  using (public.get_user_role() in ('owner', 'admin', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'technician'));

drop policy if exists "jobs_all_authenticated" on public.jobs;
drop policy if exists "jobs_detailing_roles" on public.jobs;
create policy "jobs_detailing_roles" on public.jobs for all
  using (public.get_user_role() in ('owner', 'admin', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'technician'));

drop policy if exists "job_photos_all_authenticated" on public.job_photos;
drop policy if exists "job_photos_detailing_roles" on public.job_photos;
create policy "job_photos_detailing_roles" on public.job_photos for all
  using (public.get_user_role() in ('owner', 'admin', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'technician'));
