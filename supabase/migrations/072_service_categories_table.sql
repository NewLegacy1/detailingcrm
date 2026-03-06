-- Managed service categories: create, rename, delete; assign services to categories.
-- Replaces free-form services.category text with service_categories table + services.category_id.

create table if not exists public.service_categories (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(org_id, name)
);

create index if not exists idx_service_categories_org on public.service_categories(org_id);
alter table public.service_categories enable row level security;

-- Same org as services: use existing get_user_org_id / detailing roles
create policy "service_categories_detailing_roles" on public.service_categories for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and public.get_user_org_id() is not null
    and org_id = public.get_user_org_id()
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and public.get_user_org_id() is not null
    and org_id = public.get_user_org_id()
  );

-- Add category_id to services (keep category text for now to backfill)
alter table public.services
  add column if not exists category_id uuid references public.service_categories(id) on delete set null;

-- Backfill: create service_categories from distinct (org_id, category) where category is not null
insert into public.service_categories (org_id, name, sort_order)
select org_id, cat_name, ord - 1
from (
  select s.org_id, nullif(trim(s.category), '') as cat_name,
    row_number() over (partition by s.org_id order by nullif(trim(s.category), '')) as ord
  from (select distinct org_id, category from public.services where org_id is not null and nullif(trim(category), '') is not null) s
) x
on conflict (org_id, name) do nothing;

-- Assign services to category by matching name
update public.services s
set category_id = (
  select sc.id from public.service_categories sc
  where sc.org_id = s.org_id and sc.name = nullif(trim(s.category), '')
  limit 1
)
where s.org_id is not null and nullif(trim(s.category), '') is not null;

-- Drop old text column
alter table public.services drop column if exists category;

comment on table public.service_categories is 'Managed categories per org (e.g. Basic, Premium). Services are assigned via services.category_id.';
comment on column public.services.category_id is 'Optional category for grouping on booking page.';
