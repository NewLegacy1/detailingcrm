-- Track per-job pricing: base price, size offset, and selected add-ons

alter table public.jobs
  add column if not exists base_price numeric(12,2) default 0,
  add column if not exists size_price_offset numeric(12,2) default 0;

create table if not exists public.job_upsells (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  upsell_id    uuid references public.service_upsells(id) on delete set null,
  name         text not null,
  price        numeric(12,2) not null default 0,
  created_at   timestamptz default now()
);

create index if not exists idx_job_upsells_job_id on public.job_upsells(job_id);

-- Allow filtering add-ons by service (null = available for all services)
alter table public.service_upsells
  add column if not exists service_ids uuid[] default null;
