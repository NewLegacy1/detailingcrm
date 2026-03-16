-- Per-service car size pricing (defaults: sedan +0, suv 5-seat +20, suv 7-seat +30, truck +40; custom sizes allowed)

create table if not exists public.service_size_prices (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references public.services(id) on delete cascade,
  size_key text not null,
  label text not null,
  price_offset decimal(12,2) not null default 0
);

create index if not exists idx_service_size_prices_service_id on public.service_size_prices(service_id);
create unique index if not exists idx_service_size_prices_service_size on public.service_size_prices(service_id, size_key);
alter table public.service_size_prices enable row level security;

drop policy if exists "service_size_prices_authenticated" on public.service_size_prices;
create policy "service_size_prices_authenticated" on public.service_size_prices for all
  using (true)
  with check (true);
