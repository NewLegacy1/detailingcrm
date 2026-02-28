-- Detailing CRM: initial schema (idempotent)
create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'pending' check (role in ('pending', 'owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo')),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients (customers)
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company text,
  address text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  job_id uuid,
  created_by uuid not null references auth.users(id) on delete cascade,
  stripe_invoice_id text,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'sent', 'paid', 'void')),
  currency text not null default 'usd',
  amount_total decimal(12,2) not null default 0,
  amount_due decimal(12,2),
  due_date date,
  line_items jsonb not null default '[]',
  memo text,
  footer text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper
create or replace function public.get_user_role()
returns text as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '');
$$ language sql security definer stable;

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'pending', coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Owners can manage all profiles" on public.profiles;
create policy "Owners can manage all profiles" on public.profiles for all using (public.get_user_role() = 'owner');
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Clients all authenticated" on public.clients;
create policy "Clients all authenticated" on public.clients for all
  using (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'))
  with check (public.get_user_role() in ('owner', 'account_manager', 'closer', 'media_buyer', 'cold_caller', 'demo'));

drop policy if exists "Account managers read clients" on public.clients;
create policy "Account managers read clients" on public.clients for select
  using (public.get_user_role() = 'account_manager');

drop policy if exists "Invoices owner account_manager" on public.invoices;
create policy "Invoices owner account_manager" on public.invoices for all
  using (public.get_user_role() in ('owner', 'account_manager', 'demo'))
  with check (public.get_user_role() in ('owner', 'account_manager', 'demo'));
