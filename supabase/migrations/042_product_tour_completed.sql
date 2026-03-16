-- Product tour completed flag for owner setup wizard (one-time tour)
alter table public.profiles
  add column if not exists product_tour_completed boolean default false;
