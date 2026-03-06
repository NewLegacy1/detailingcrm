-- Services: org-scoped RLS and auto-set org_id on insert

-- 1. Trigger to set org_id from current user's profile when inserting
create or replace function public.set_service_org_on_insert()
returns trigger as $$
begin
  if new.org_id is null then
    new.org_id := public.get_user_org_id();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_service_org_on_insert on public.services;
create trigger set_service_org_on_insert
  before insert on public.services
  for each row execute procedure public.set_service_org_on_insert();

-- 2. Replace role-only policy with org-scoped policy
drop policy if exists "services_detailing_roles" on public.services;
drop policy if exists "services_all_authenticated" on public.services;

create policy "services_org_scoped_select" on public.services for select
  using (
    public.get_user_role() in ('owner', 'admin', 'technician')
    and public.get_user_org_id() is not null
    and org_id = public.get_user_org_id()
  );

create policy "services_org_scoped_insert" on public.services for insert
  with check (
    public.get_user_role() in ('owner', 'admin', 'technician')
    and public.get_user_org_id() is not null
    and (org_id is null or org_id = public.get_user_org_id())
  );

create policy "services_org_scoped_update" on public.services for update
  using (
    public.get_user_role() in ('owner', 'admin', 'technician')
    and public.get_user_org_id() is not null
    and org_id = public.get_user_org_id()
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'technician')
    and org_id = public.get_user_org_id()
  );

create policy "services_org_scoped_delete" on public.services for delete
  using (
    public.get_user_role() in ('owner', 'admin', 'technician')
    and public.get_user_org_id() is not null
    and org_id = public.get_user_org_id()
  );
