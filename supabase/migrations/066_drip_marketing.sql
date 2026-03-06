-- Drip Marketing: campaigns, runs, and tracking links for automations/sequences

-- 1. drip_campaigns: one per org, defines trigger + workflow (nodes/edges as jsonb)
create table if not exists public.drip_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in (
    'job_paid',
    'new_booking',
    'abandoned_booking',
    'job_completed',
    'appointment_reminder'
  )),
  workflow_json jsonb not null default '{"nodes":[],"edges":[]}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_drip_campaigns_org_id on public.drip_campaigns(org_id);
create index if not exists idx_drip_campaigns_trigger_active on public.drip_campaigns(trigger_type, active) where active = true;

alter table public.drip_campaigns enable row level security;

drop policy if exists "drip_campaigns_same_org" on public.drip_campaigns;
create policy "drip_campaigns_same_org" on public.drip_campaigns for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager')
    and org_id = public.get_user_org_id()
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager')
    and org_id = public.get_user_org_id()
  );

comment on table public.drip_campaigns is 'Drip/sequence campaigns per org. workflow_json holds React Flow nodes + edges.';
comment on column public.drip_campaigns.trigger_type is 'Start trigger: job_paid, new_booking, abandoned_booking, job_completed, appointment_reminder';
comment on column public.drip_campaigns.workflow_json is 'JSON: { nodes: Array<{id,type,data,position}>, edges: Array<{id,source,target,sourceHandle?,targetHandle?}> }';


-- 2. drip_runs: one per execution (one campaign + one context: customer/job/booking_session)
create table if not exists public.drip_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.drip_campaigns(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.clients(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  booking_session_id uuid references public.booking_sessions(id) on delete set null,
  current_step text not null,  -- node id in workflow
  status text not null default 'running' check (status in ('running', 'completed', 'cancelled')),
  variables jsonb not null default '{}',  -- e.g. trackedBookingUrl, lastSmsId
  next_step_at timestamptz,  -- when to run next step (null = run immediately)
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_drip_runs_campaign_id on public.drip_runs(campaign_id);
create index if not exists idx_drip_runs_org_id on public.drip_runs(org_id);
create index if not exists idx_drip_runs_next_step on public.drip_runs(next_step_at) where status = 'running' and next_step_at is not null;
create index if not exists idx_drip_runs_running_immediate on public.drip_runs(org_id, started_at) where status = 'running' and next_step_at is null;

alter table public.drip_runs enable row level security;

drop policy if exists "drip_runs_same_org" on public.drip_runs;
create policy "drip_runs_same_org" on public.drip_runs for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and org_id = public.get_user_org_id()
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and org_id = public.get_user_org_id()
  );

comment on table public.drip_runs is 'One run per campaign execution. current_step = node id; next_step_at drives cron.';
comment on column public.drip_runs.variables is 'Runtime vars: trackedBookingUrl, etc., for placeholders in steps.';


-- 3. tracking_links: for link_opened / tracked URL in SMS/email
create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.drip_runs(id) on delete cascade,
  token text not null unique,
  target_url text not null,
  visited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tracking_links_run_id on public.tracking_links(run_id);
create unique index if not exists idx_tracking_links_token on public.tracking_links(token);

alter table public.tracking_links enable row level security;

-- Service role / cron will update visited_at via token; app users read via run -> org
drop policy if exists "tracking_links_via_run_org" on public.tracking_links;
create policy "tracking_links_via_run_org" on public.tracking_links for all
  using (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.drip_runs r
      where r.id = tracking_links.run_id and r.org_id = public.get_user_org_id()
    )
  )
  with check (
    public.get_user_role() in ('owner', 'admin', 'manager', 'technician')
    and exists (
      select 1 from public.drip_runs r
      where r.id = tracking_links.run_id and r.org_id = public.get_user_org_id()
    )
  );

comment on table public.tracking_links is 'Tracked links in drip steps. Route /r/[token] sets visited_at then redirects to target_url.';
