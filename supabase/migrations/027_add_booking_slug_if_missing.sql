-- Ensure organizations has booking_slug (run this if the column is missing)

-- 1. Add column if it doesn't exist
alter table public.organizations
  add column if not exists booking_slug text;

-- 2. Backfill: give each org a unique slug where null (org-<uuid>)
update public.organizations
set booking_slug = 'org-' || replace(id::text, '-', '')
where booking_slug is null;

-- 3. Unique index so slugs are unique
create unique index if not exists idx_organizations_booking_slug on public.organizations(booking_slug);

-- 4. Require a slug on every org (backfill above ensures no nulls)
alter table public.organizations alter column booking_slug set not null;

comment on column public.organizations.booking_slug is 'Unique URL slug for public booking page, e.g. showroom-autocare -> /book/showroom-autocare';
