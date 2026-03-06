-- Maintenance discount (Option B): org settings + job/pending_booking discount amount

-- Organizations: type 'none' | 'percent' | 'fixed', value e.g. 10 for 10% or 20 for $20
alter table public.organizations
  add column if not exists maintenance_discount_type text default 'none';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'maintenance_discount_type_check') then
    alter table public.organizations add constraint maintenance_discount_type_check check (maintenance_discount_type in ('none', 'percent', 'fixed'));
  end if;
end $$;
alter table public.organizations
  add column if not exists maintenance_discount_value decimal(12,2) not null default 0;

comment on column public.organizations.maintenance_discount_type is 'Applied when customer books via maintenance link: none, percent, or fixed amount.';
comment on column public.organizations.maintenance_discount_value is 'For percent: 10 = 10%. For fixed: 20 = $20 off.';

-- Jobs: store discount amount applied at booking (e.g. maintenance rebook)
alter table public.jobs
  add column if not exists discount_amount decimal(12,2) not null default 0;

comment on column public.jobs.discount_amount is 'Discount applied at booking (e.g. maintenance rebook). Display total = base + size + upsells - discount_amount.';

-- Pending bookings: same for deposit flow
alter table public.pending_bookings
  add column if not exists discount_amount decimal(12,2) not null default 0;

comment on column public.pending_bookings.discount_amount is 'Discount applied at booking; used when creating job from completed checkout.';
