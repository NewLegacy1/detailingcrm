-- Vehicles (cars per customer)
create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.clients(id) on delete cascade,
  make text not null,
  model text not null,
  year int,
  color text,
  vin text,
  notes text,
  mileage int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repair vehicles: ensure customer_id exists (rename from client_id or add column)
do $$
declare
  first_client_id uuid;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vehicles' and column_name = 'customer_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vehicles' and column_name = 'client_id') then
      alter table public.vehicles rename column client_id to customer_id;
    else
      alter table public.vehicles add column customer_id uuid references public.clients(id) on delete cascade;
      select id into first_client_id from public.clients limit 1;
      if first_client_id is not null then
        update public.vehicles set customer_id = first_client_id where customer_id is null;
        alter table public.vehicles alter column customer_id set not null;
      end if;
    end if;
  end if;
end $$;

create index if not exists idx_vehicles_customer_id on public.vehicles(customer_id);
alter table public.vehicles enable row level security;
drop policy if exists "vehicles_all_authenticated" on public.vehicles;
create policy "vehicles_all_authenticated" on public.vehicles for all
  using (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'))
  with check (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'));

-- Services catalog
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  duration_mins int not null default 60,
  base_price decimal(12,2) not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;
drop policy if exists "services_all_authenticated" on public.services;
create policy "services_all_authenticated" on public.services for all
  using (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'))
  with check (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'));

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.clients(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  scheduled_at timestamptz not null,
  address text not null,
  assigned_tech_id uuid references auth.users(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'done', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repair jobs: ensure customer_id exists (rename from client_id or add column)
do $$
declare
  first_client_id uuid;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'jobs' and column_name = 'customer_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'jobs' and column_name = 'client_id') then
      alter table public.jobs rename column client_id to customer_id;
    else
      alter table public.jobs add column customer_id uuid references public.clients(id) on delete cascade;
      select id into first_client_id from public.clients limit 1;
      if first_client_id is not null then
        update public.jobs set customer_id = first_client_id where customer_id is null;
        alter table public.jobs alter column customer_id set not null;
      end if;
    end if;
  end if;
end $$;

create index if not exists idx_jobs_customer_id on public.jobs(customer_id);
create index if not exists idx_jobs_scheduled_at on public.jobs(scheduled_at);
create index if not exists idx_jobs_assigned_tech_id on public.jobs(assigned_tech_id);
alter table public.jobs enable row level security;
drop policy if exists "jobs_all_authenticated" on public.jobs;
create policy "jobs_all_authenticated" on public.jobs for all
  using (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'))
  with check (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'));

-- Job photos
create table if not exists public.job_photos (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  url text not null,
  type text not null check (type in ('before', 'after')),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_photos_job_id on public.job_photos(job_id);
alter table public.job_photos enable row level security;
drop policy if exists "job_photos_all_authenticated" on public.job_photos;
create policy "job_photos_all_authenticated" on public.job_photos for all
  using (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'))
  with check (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'));

-- Link invoices to jobs (column already exists in 001; add FK now that jobs table exists)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_job_id_fkey') then
    alter table public.invoices add constraint invoices_job_id_fkey foreign key (job_id) references public.jobs(id) on delete set null;
  end if;
end $$;
