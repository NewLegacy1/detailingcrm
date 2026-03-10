-- Per-vehicle size for pricing (each vehicle on a job can have its own size)
alter table public.job_vehicles
  add column if not exists size_price_offset numeric(12,2) not null default 0;

comment on column public.job_vehicles.size_price_offset is 'Price offset for this vehicle size (e.g. SUV +$20). Applied per vehicle.';
