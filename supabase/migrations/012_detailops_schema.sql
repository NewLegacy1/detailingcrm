-- DetailOps CRM: communications, services extensions, upsells, job en_route, checklist, payments, reviews, automation settings

-- 1. Communications (emails/SMS per client)
create table if not exists public.communications (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  direction text not null check (direction in ('in', 'out')),
  body text,
  external_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_communications_client_id on public.communications(client_id);
create index if not exists idx_communications_job_id on public.communications(job_id);
alter table public.communications enable row level security;
drop policy if exists "communications_authenticated" on public.communications;
create policy "communications_authenticated" on public.communications for all
  using (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'));

-- 2. Services: add cost and photo_urls
alter table public.services
  add column if not exists cost decimal(12,2) default 0,
  add column if not exists photo_urls jsonb default '[]';

-- 3. Service upsells (categories: ceramic, extras, recommended, etc.)
create table if not exists public.service_upsells (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  price decimal(12,2) not null default 0,
  category text not null default 'extras',
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_upsells_org_id on public.service_upsells(org_id);
alter table public.service_upsells enable row level security;
drop policy if exists "service_upsells_authenticated" on public.service_upsells;
create policy "service_upsells_authenticated" on public.service_upsells for all
  using (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'));

-- 4. Jobs: add status 'en_route'
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('scheduled', 'en_route', 'in_progress', 'done', 'cancelled', 'no_show'));

-- 5. Default checklist (per org) - used when creating new jobs
create table if not exists public.organization_default_checklist (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_org_default_checklist_org_order on public.organization_default_checklist(org_id, sort_order);
alter table public.organization_default_checklist enable row level security;
drop policy if exists "org_default_checklist_authenticated" on public.organization_default_checklist;
create policy "org_default_checklist_authenticated" on public.organization_default_checklist for all
  using (org_id in (select org_id from public.profiles where id = auth.uid()))
  with check (org_id in (select org_id from public.profiles where id = auth.uid()));

-- 6. Job checklist items (per job)
create table if not exists public.job_checklist_items (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  label text not null,
  checked boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_checklist_items_job_id on public.job_checklist_items(job_id);
alter table public.job_checklist_items enable row level security;
drop policy if exists "job_checklist_items_authenticated" on public.job_checklist_items;
create policy "job_checklist_items_authenticated" on public.job_checklist_items for all
  using (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'));

-- 7. Job payments (cash, etransfer, cheque, stripe)
create table if not exists public.job_payments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  amount decimal(12,2) not null,
  method text not null check (method in ('cash', 'etransfer', 'cheque', 'stripe')),
  reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_payments_job_id on public.job_payments(job_id);
alter table public.job_payments enable row level security;
drop policy if exists "job_payments_authenticated" on public.job_payments;
create policy "job_payments_authenticated" on public.job_payments for all
  using (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'));

-- 8. Reviews (for rebook and dashboard)
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  rating int not null check (rating >= 1 and rating <= 5),
  feedback_text text,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_job_id on public.reviews(job_id);
create index if not exists idx_reviews_client_id on public.reviews(client_id);
alter table public.reviews enable row level security;
drop policy if exists "reviews_authenticated" on public.reviews;
create policy "reviews_authenticated" on public.reviews for all
  using (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'))
  with check (public.get_user_role() in ('owner', 'admin', 'manager', 'technician'));

-- 9. Automation settings (on organizations)
alter table public.organizations
  add column if not exists review_follow_up_days int default 1,
  add column if not exists review_page_url text,
  add column if not exists gmb_redirect_url text,
  add column if not exists under_five_feedback_email text,
  add column if not exists new_booking_email_on boolean default true,
  add column if not exists new_booking_sms_on boolean default true,
  add column if not exists job_reminder_mins int default 60,
  add column if not exists job_reminder_email_on boolean default false,
  add column if not exists maintenance_upsell_days int[] default array[14, 30, 45],
  add column if not exists maintenance_detail_url text;
