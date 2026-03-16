-- Shop location: service mode (mobile / shop / both) and shop address for Pro orgs

alter table public.organizations
  add column if not exists service_mode text default 'mobile' check (service_mode in ('mobile', 'shop', 'both')),
  add column if not exists shop_address text,
  add column if not exists shop_address_lat decimal(10, 7),
  add column if not exists shop_address_lng decimal(10, 7);
