-- Job automation tracking: org_id for cron, sent timestamps for review/reminder/maintenance

alter table public.jobs
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists review_request_sent_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists maintenance_upsell_sent_days int[] default '{}';

update public.jobs
set org_id = (select id from public.organizations order by created_at asc limit 1)
where org_id is null;

create index if not exists idx_jobs_org_id on public.jobs(org_id);
create index if not exists idx_jobs_status_scheduled_at on public.jobs(status, scheduled_at);
create index if not exists idx_jobs_status_updated_at on public.jobs(status, updated_at);
