-- Customer accounts for the booking page: one auth user can be linked to one client per org.
-- Used to prefill details, show saved vehicles and past services when the customer signs in.

create table if not exists public.booking_customer_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, org_id)
);

create index if not exists idx_booking_customer_accounts_user_org on public.booking_customer_accounts(user_id, org_id);
create index if not exists idx_booking_customer_accounts_client on public.booking_customer_accounts(client_id);

alter table public.booking_customer_accounts enable row level security;

-- Customers can read and update their own row for the org (used by booking page when signed in).
create policy "Customer can read own booking account"
  on public.booking_customer_accounts for select
  using (user_id = auth.uid());

create policy "Customer can update own booking account"
  on public.booking_customer_accounts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Insert is done server-side (register API with service role). No policy needed for insert for anon.
-- Service role bypasses RLS for register and for booking flow.

comment on table public.booking_customer_accounts is 'Links a Supabase Auth user to a client record per org for the public booking page. One user can be one client per organization.';
