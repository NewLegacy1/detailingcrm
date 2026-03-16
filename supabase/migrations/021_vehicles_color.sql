-- Ensure vehicles has 'color' column (in case table was created without it or schema cache is stale)
alter table public.vehicles
  add column if not exists color text;
