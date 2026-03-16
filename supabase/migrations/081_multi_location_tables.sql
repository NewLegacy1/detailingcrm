-- Multi-location booking (Pro only): locations table, location_services, and new columns.
-- Phase 1: data model only; no UI. Do not set multi_location_enabled for any org.

-- 1. Organizations: flag to enable multi-location booking (Pro only)
alter table public.organizations
  add column if not exists multi_location_enabled boolean not null default false;

comment on column public.organizations.multi_location_enabled is 'When true and Pro, booking shows location step and admin can manage locations.';

-- 2. Locations: one per physical shop/area per org
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  lat decimal(10, 7),
  lng decimal(10, 7),
  timezone text,
  service_mode text not null default 'both' check (service_mode in ('mobile', 'shop', 'both')),
  hours_start int not null default 9,
  hours_end int not null default 18,
  slot_interval_minutes int not null default 30,
  blackout_dates date[] default '{}',
  blackout_ranges jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  booking_promo_code_prefix text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_locations_org_id on public.locations(org_id);
create index if not exists idx_locations_org_active on public.locations(org_id, is_active) where is_active = true;

alter table public.locations enable row level security;

create policy "locations_org_scoped" on public.locations for all
  using (org_id = public.get_user_org_id())
  with check (org_id = public.get_user_org_id());

comment on table public.locations is 'Physical locations per org for multi-location booking (Pro only).';

-- 3. Location services: which services are offered at which location (only rows present = offered)
create table if not exists public.location_services (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  is_offered boolean not null default true,
  price_override decimal(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(location_id, service_id)
);

create index if not exists idx_location_services_location_id on public.location_services(location_id);
create index if not exists idx_location_services_service_id on public.location_services(service_id);

alter table public.location_services enable row level security;

create policy "location_services_via_location" on public.location_services for all
  using (
    exists (
      select 1 from public.locations l
      where l.id = location_services.location_id and l.org_id = public.get_user_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.locations l
      where l.id = location_services.location_id and l.org_id = public.get_user_org_id()
    )
  );

comment on table public.location_services is 'Services offered per location; no row = not offered at that location.';

-- 4. Jobs: optional location (null = legacy / single-location)
alter table public.jobs
  add column if not exists location_id uuid references public.locations(id) on delete set null;

create index if not exists idx_jobs_location_id on public.jobs(location_id);

comment on column public.jobs.location_id is 'For multi-location Pro orgs; null for legacy or single-location.';

-- 5. Pending bookings: location for checkout completion
alter table public.pending_bookings
  add column if not exists location_id uuid references public.locations(id) on delete set null;

comment on column public.pending_bookings.location_id is 'Set when completing Stripe checkout so created job gets same location_id.';

-- 6. Booking sessions (abandoned cart): optional location for restore
alter table public.booking_sessions
  add column if not exists location_id uuid references public.locations(id) on delete set null;

comment on column public.booking_sessions.location_id is 'Pre-selected location when restoring abandoned booking session.';
