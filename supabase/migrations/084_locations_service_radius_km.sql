-- Per-location service area radius (km). Used with map picker circle.
alter table public.locations
  add column if not exists service_radius_km decimal(10, 2) default null;

comment on column public.locations.service_radius_km is 'Service area radius in km for this location (from map picker circle). Null = use org default or no limit.';
