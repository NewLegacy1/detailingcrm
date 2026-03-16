-- Promo codes: org-scoped codes for booking checkout (name, code, discount type/value, usage tracking).

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value decimal(12,2) not null check (discount_value >= 0),
  usage_limit int,
  used_count int not null default 0,
  total_discount_amount decimal(12,2) not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, code)
);

create index if not exists idx_promo_codes_org_id on public.promo_codes(org_id);
create index if not exists idx_promo_codes_org_code on public.promo_codes(org_id, lower(code));

alter table public.promo_codes enable row level security;

create policy "promo_codes_org" on public.promo_codes for all
  using (org_id = public.get_user_org_id())
  with check (org_id = public.get_user_org_id());

comment on table public.promo_codes is 'Promo codes for booking checkout; discount_type percent = discount_value 0-100, fixed = dollars off.';

-- Link jobs to promo code for tracking
alter table public.jobs
  add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null;

create index if not exists idx_jobs_promo_code_id on public.jobs(promo_code_id);

-- Link pending_bookings to promo code (for deposit/checkout flow)
alter table public.pending_bookings
  add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null;

create index if not exists idx_pending_bookings_promo_code_id on public.pending_bookings(promo_code_id);
