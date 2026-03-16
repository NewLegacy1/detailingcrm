-- Service categories (e.g. Basic, Premium) and sort order for CRM and booking grouping.

alter table public.services
  add column if not exists category text,
  add column if not exists sort_order int not null default 0;

comment on column public.services.category is 'Free-form category label per org (e.g. Basic, Premium) for grouping on booking page.';
comment on column public.services.sort_order is 'Display order within category (and globally when category is null).';
