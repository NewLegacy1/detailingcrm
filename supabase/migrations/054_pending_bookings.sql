-- Pending bookings: hold booking payload until Stripe checkout completes (Pro deposit flow).
-- After webhook checkout.session.completed we create client, vehicle, job, job_upsells, job_payments and mark pending_booking completed.

create table if not exists public.pending_bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  scheduled_at timestamptz not null,
  address text not null,
  customer jsonb not null,
  vehicle jsonb,
  size_key text,
  base_price decimal(12,2) not null default 0,
  size_price_offset decimal(12,2) not null default 0,
  upsells jsonb not null default '[]',
  notes text,
  stripe_checkout_session_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  deposit_amount_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pending_bookings_org_id on public.pending_bookings(org_id);
create index if not exists idx_pending_bookings_stripe_session on public.pending_bookings(stripe_checkout_session_id);
create index if not exists idx_pending_bookings_status on public.pending_bookings(status);

alter table public.pending_bookings enable row level security;

-- Only service role / backend should access (no direct client access)
create policy "pending_bookings_service_role" on public.pending_bookings for all
  using (false)
  with check (false);

comment on table public.pending_bookings is 'Holds booking data until Stripe Checkout (deposit) completes; then webhook creates job and marks completed.';
