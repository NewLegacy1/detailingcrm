-- Allow same service on multiple vehicles: add vehicle_id to job_services.
-- One row per (job, service, vehicle); same service can appear for different vehicles.

alter table public.job_services
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;

create index if not exists idx_job_services_vehicle_id on public.job_services(vehicle_id);

-- Drop old unique so we can have (job_id, service_id, vehicle_id) for different vehicles
alter table public.job_services drop constraint if exists job_services_job_id_service_id_key;

-- Allow one row per (job_id, service_id, vehicle_id). Multiple rows same service_id for different vehicle_ids.
create unique index if not exists idx_job_services_job_service_vehicle
  on public.job_services (job_id, service_id, vehicle_id);

-- Backfill: set vehicle_id to job's first vehicle for existing rows
update public.job_services js
set vehicle_id = (
  select jv.vehicle_id from public.job_vehicles jv where jv.job_id = js.job_id limit 1
)
where js.vehicle_id is null;

update public.job_services js
set vehicle_id = (select j.vehicle_id from public.jobs j where j.id = js.job_id and j.vehicle_id is not null limit 1)
where js.vehicle_id is null;
