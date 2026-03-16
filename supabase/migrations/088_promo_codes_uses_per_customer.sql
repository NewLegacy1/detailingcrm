-- Optional limit: max times a single customer can use this promo (identified by email/phone at checkout).

alter table public.promo_codes
  add column if not exists uses_per_customer int check (uses_per_customer is null or uses_per_customer >= 1);

comment on column public.promo_codes.uses_per_customer is 'Max times one customer (same email/phone) can use this code; null = unlimited.';
