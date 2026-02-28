-- Add org_id to services so booking page can load services per organization

-- 1. Add column (nullable so existing rows are valid)
alter table public.services
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

-- 2. Backfill: assign all existing services to the first organization
update public.services
set org_id = (select id from public.organizations order by created_at asc nulls last limit 1)
where org_id is null;

-- 3. Index for fast lookup by org (used by get_public_booking_context)
create index if not exists idx_services_org_id on public.services(org_id);

comment on column public.services.org_id is 'Organization that owns this service. Used to show services on the public booking page for that org.';
