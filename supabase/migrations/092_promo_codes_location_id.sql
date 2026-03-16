-- Promo codes: optional location scope. When set, code is only for that location (multi-location).
-- Null = org-wide (legacy / single-location).

alter table public.promo_codes
  add column if not exists location_id uuid references public.locations(id) on delete set null;

create index if not exists idx_promo_codes_location_id on public.promo_codes(location_id);

comment on column public.promo_codes.location_id is 'When set, this promo code is only valid for bookings at this location. Null = org-wide.';
