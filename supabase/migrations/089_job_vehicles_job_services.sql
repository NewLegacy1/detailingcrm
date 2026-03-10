-- Multiple vehicles and services per job: junction tables

-- job_vehicles: many-to-many job <-> vehicles
create table if not exists public.job_vehicles (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(job_id, vehicle_id)
);

create index if not exists idx_job_vehicles_job_id on public.job_vehicles(job_id);
create index if not exists idx_job_vehicles_vehicle_id on public.job_vehicles(vehicle_id);
alter table public.job_vehicles enable row level security;
drop policy if exists "job_vehicles_org" on public.job_vehicles;
create policy "job_vehicles_org" on public.job_vehicles for all
  using (exists (select 1 from public.jobs j where j.id = job_vehicles.job_id and j.org_id = public.get_user_org_id()))
  with check (exists (select 1 from public.jobs j where j.id = job_vehicles.job_id and j.org_id = public.get_user_org_id()));

-- job_services: many-to-many job <-> services (with optional price override per line)
create table if not exists public.job_services (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  base_price decimal(12,2) null,
  created_at timestamptz not null default now(),
  unique(job_id, service_id)
);

create index if not exists idx_job_services_job_id on public.job_services(job_id);
create index if not exists idx_job_services_service_id on public.job_services(service_id);
alter table public.job_services enable row level security;
drop policy if exists "job_services_org" on public.job_services;
create policy "job_services_org" on public.job_services for all
  using (exists (select 1 from public.jobs j where j.id = job_services.job_id and j.org_id = public.get_user_org_id()))
  with check (exists (select 1 from public.jobs j where j.id = job_services.job_id and j.org_id = public.get_user_org_id()));

-- Backfill: insert existing job.vehicle_id and job.service_id into junction tables (ignore if null)
insert into public.job_vehicles (job_id, vehicle_id)
  select id, vehicle_id from public.jobs where vehicle_id is not null
  on conflict (job_id, vehicle_id) do nothing;

insert into public.job_services (job_id, service_id, base_price)
  select id, service_id, base_price from public.jobs where service_id is not null
  on conflict (job_id, service_id) do nothing;
