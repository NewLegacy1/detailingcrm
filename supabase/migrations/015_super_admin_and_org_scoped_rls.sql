-- Super admin (CRM editor) + org-scoped data so business owners/team only see their company

-- 1. Helper: user's org_id (null if no profile or no org)
create or replace function public.get_user_org_id()
returns uuid as $$
  select org_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- 2. Profiles: add is_super_admin (only you use this to access CRM admin settings)
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

comment on column public.profiles.is_super_admin is 'When true, user can access Settings > Admin (CRM configuration). Set manually for the app owner. Example: update profiles set is_super_admin = true where id = ''your-auth-user-uuid'';';

-- 3. Clients: add org_id and backfill
alter table public.clients
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

update public.clients
set org_id = (select org_id from public.profiles where id = public.clients.created_by)
where org_id is null and created_by is not null;

update public.clients
set org_id = (select id from public.organizations order by created_at asc limit 1)
where org_id is null;

create index if not exists idx_clients_org_id on public.clients(org_id);

-- Trigger: set client org_id from creator when inserting
create or replace function public.set_client_org_on_insert()
returns trigger as $$
begin
  if new.org_id is null then
    new.org_id := public.get_user_org_id();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_client_org_on_insert on public.clients;
create trigger set_client_org_on_insert
  before insert on public.clients
  for each row execute procedure public.set_client_org_on_insert();

-- 4. Profiles RLS: same-org only (so team list shows only company members)
drop policy if exists "Owners can manage all profiles" on public.profiles;

create policy "Users can read profiles in same org" on public.profiles for select
  using (org_id = public.get_user_org_id());

create policy "Owner or Admin can update profiles in same org" on public.profiles for update
  using (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'admin'))
  with check (org_id = public.get_user_org_id() and public.get_user_role() in ('owner', 'admin'));

-- 5. Jobs RLS: same org + role
drop policy if exists "jobs_detailing_roles" on public.jobs;
create policy "jobs_detailing_roles" on public.jobs for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and (public.get_user_org_id() is not null and org_id = public.get_user_org_id())
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and (public.get_user_org_id() is not null and org_id = public.get_user_org_id())
  );

-- 6. Clients RLS: same org + role
drop policy if exists "Clients detailing roles" on public.clients;
create policy "Clients detailing roles" on public.clients for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and (public.get_user_org_id() is not null and org_id = public.get_user_org_id())
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and (public.get_user_org_id() is not null and org_id = public.get_user_org_id())
  );

-- 7. Vehicles RLS: via client's org
drop policy if exists "vehicles_detailing_roles" on public.vehicles;
create policy "vehicles_detailing_roles" on public.vehicles for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.clients c
      where c.id = vehicles.customer_id and c.org_id = public.get_user_org_id()
    )
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.clients c
      where c.id = vehicles.customer_id and c.org_id = public.get_user_org_id()
    )
  );

-- 8. Invoices RLS: via client's org
drop policy if exists "Invoices owner admin" on public.invoices;
create policy "Invoices owner admin" on public.invoices for all
  using (
    public.get_user_role() in ('owner', 'admin')
    and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.org_id = public.get_user_org_id()
    )
  )
  with check (
    public.get_user_role() in ('owner', 'admin')
    and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.org_id = public.get_user_org_id()
    )
  );

-- 9. Job_photos: via job's org
drop policy if exists "job_photos_detailing_roles" on public.job_photos;
create policy "job_photos_detailing_roles" on public.job_photos for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.jobs j
      where j.id = job_photos.job_id and j.org_id = public.get_user_org_id()
    )
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.jobs j
      where j.id = job_photos.job_id and j.org_id = public.get_user_org_id()
    )
  );

-- 10. Communications: via client's org (012_detailops_schema)
drop policy if exists "communications_authenticated" on public.communications;
create policy "communications_authenticated" on public.communications for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.clients c
      where c.id = communications.client_id and c.org_id = public.get_user_org_id()
    )
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.clients c
      where c.id = communications.client_id and c.org_id = public.get_user_org_id()
    )
  );

-- 11. Service_upsells: already has org_id in 012; tighten to same org
drop policy if exists "service_upsells_authenticated" on public.service_upsells;
create policy "service_upsells_authenticated" on public.service_upsells for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and (org_id = public.get_user_org_id())
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and (org_id = public.get_user_org_id())
  );
