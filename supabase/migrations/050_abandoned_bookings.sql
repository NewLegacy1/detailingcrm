-- Abandoned cart tracking for booking funnel

create table if not exists public.booking_sessions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  session_token text not null unique,
  name          text,
  email         text,
  phone         text,
  service_id    uuid references public.services(id) on delete set null,
  address       text,
  step_reached  text,  -- 'service' | 'size' | 'addons' | 'datetime' | 'details'
  booked        boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_booking_sessions_org_id on public.booking_sessions(org_id);
create index if not exists idx_booking_sessions_token on public.booking_sessions(session_token);

alter table public.organizations
  add column if not exists abandoned_cart_enabled boolean default false,
  add column if not exists abandoned_cart_hours int default 1;
