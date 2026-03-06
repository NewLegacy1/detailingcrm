-- Settings + Stripe Connect + RBAC (additive, backwards compatible)

-- 1. Organizations (for Stripe Connect; single-tenant default)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text,
  stripe_account_id text,
  stripe_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organizations (id, name)
select gen_random_uuid(), 'Default'
where not exists (select 1 from public.organizations limit 1);

-- 2. Link profiles to org
alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

update public.profiles
set org_id = (select id from public.organizations order by created_at asc limit 1)
where org_id is null;

-- 3. Roles table
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission text not null,
  primary key (role_id, permission)
);

-- Insert default roles
insert into public.roles (name, key) values
  ('Owner', 'owner'),
  ('Admin', 'admin'),
  ('Manager', 'manager'),
  ('Technician', 'technician')
on conflict (key) do nothing;

-- Owner: all permissions
insert into public.role_permissions (role_id, permission)
select r.id, p from public.roles r cross join lateral unnest(array[
  'settings.view','settings.edit','team.view','team.manage',
  'invoices.view','invoices.create','invoices.send','invoices.edit','invoices.delete',
  'payments.charge','payments.refund','services.manage','schedule.manage','customers.manage',
  'stripe.connect','stripe.manage','stripe.disconnect'
]) as p
where r.key = 'owner' on conflict do nothing;

-- Admin: all except stripe.disconnect
insert into public.role_permissions (role_id, permission)
select r.id, p from public.roles r cross join lateral unnest(array[
  'settings.view','settings.edit','team.view','team.manage',
  'invoices.view','invoices.create','invoices.send','invoices.edit','invoices.delete',
  'payments.charge','payments.refund','services.manage','schedule.manage','customers.manage',
  'stripe.connect','stripe.manage'
]) as p
where r.key = 'admin' on conflict do nothing;

-- Manager
insert into public.role_permissions (role_id, permission)
select r.id, p from public.roles r cross join lateral unnest(array[
  'settings.view','team.view','invoices.view','invoices.create','invoices.send',
  'payments.charge','schedule.manage','customers.manage','stripe.connect','stripe.manage'
]) as p
where r.key = 'manager' on conflict do nothing;

-- Technician
insert into public.role_permissions (role_id, permission)
select r.id, p from public.roles r cross join lateral unnest(array[
  'schedule.manage','customers.manage'
]) as p
where r.key = 'technician' on conflict do nothing;

-- 4. role_id on profiles (optional; app falls back to profiles.role)
alter table public.profiles
  add column if not exists role_id uuid references public.roles(id) on delete set null;

update public.profiles p
set role_id = r.id
from public.roles r
where r.key = case when p.role = 'pending' then 'owner' else p.role end
and p.role_id is null;

-- 5. Organization settings columns
alter table public.organizations
  add column if not exists invoice_due_days_default int default 30,
  add column if not exists invoice_memo_default text,
  add column if not exists invoice_footer_default text,
  add column if not exists invoice_number_prefix text default 'INV-',
  add column if not exists invoice_tips_enabled boolean default false,
  add column if not exists tax_enabled boolean default false,
  add column if not exists tax_rate decimal(5,4) default 0,
  add column if not exists travel_fee_enabled boolean default false,
  add column if not exists travel_fee_amount decimal(10,2) default 0,
  add column if not exists fee_handling text default 'included',
  add column if not exists payment_methods jsonb default '["card","cash"]';

-- RLS
alter table public.organizations enable row level security;
drop policy if exists "Users can read own org" on public.organizations;
create policy "Users can read own org" on public.organizations for select
  using (id in (select org_id from public.profiles where id = auth.uid()));
drop policy if exists "Owners can update org" on public.organizations;
create policy "Owners can update org" on public.organizations for update
  using (id in (select org_id from public.profiles where id = auth.uid() and role = 'owner'));

alter table public.roles enable row level security;
drop policy if exists "Authenticated read roles" on public.roles;
create policy "Authenticated read roles" on public.roles for select to authenticated using (true);

alter table public.role_permissions enable row level security;
drop policy if exists "Authenticated read role_permissions" on public.role_permissions;
create policy "Authenticated read role_permissions" on public.role_permissions for select to authenticated using (true);
