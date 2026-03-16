-- Fix numeric overflow: invoice settings tax rate was decimal(5,4) (max 9.9999).
-- The UI sends tax as percentage (e.g. 13 for 13%), so widen to decimal(5,2) (0–999.99).

alter table public.organizations
  alter column tax_rate type decimal(5,2) using least(greatest(tax_rate::numeric, 0), 999.99);

comment on column public.organizations.tax_rate is 'Tax rate as percentage (e.g. 13 for 13%). Stored 0–999.99.';
