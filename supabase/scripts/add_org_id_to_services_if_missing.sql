-- Run this in Supabase Dashboard → SQL Editor if you get:
-- "Could not find the 'org_id' column of 'services' in the schema cache"
-- (This is the same as migration 029.)

-- 1. Add column
alter table public.services
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

-- 2. Backfill existing rows
update public.services
set org_id = (select id from public.organizations order by created_at asc nulls last limit 1)
where org_id is null;

-- 3. Index
create index if not exists idx_services_org_id on public.services(org_id);

-- Then run migration 030 (RLS + trigger) if you haven't, or run:
-- supabase db push
-- so all migrations are applied.
