-- Booking: custom domain resolution and map center for client-facing booking page

-- 1. Organizations: booking_domain (for custom domain e.g. book.theirdomain.com)
alter table public.organizations
  add column if not exists booking_domain text;

create unique index if not exists idx_organizations_booking_domain on public.organizations(booking_domain) where booking_domain is not null;

-- 2. Organizations: map center (lat/lng for booking map)
alter table public.organizations
  add column if not exists map_lat decimal(10, 7) default null,
  add column if not exists map_lng decimal(10, 7) default null;

-- 3. Resolve custom domain to booking_slug (anon can call; no org data exposed)
create or replace function public.get_booking_slug_for_domain(domain text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select booking_slug from public.organizations where booking_domain = domain limit 1;
$$;

comment on function public.get_booking_slug_for_domain is 'Used by booking middleware to rewrite custom domain to /book/[slug]. Anon may execute.';

grant execute on function public.get_booking_slug_for_domain(text) to anon;
