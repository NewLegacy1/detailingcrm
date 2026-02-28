-- Google Calendar integration (additive)

-- 1. Organization: Google tokens and sync options
alter table public.organizations
  add column if not exists google_company_calendar_id text,
  add column if not exists google_tokens_encrypted text,
  add column if not exists google_token_meta jsonb,
  add column if not exists google_sync_to_company boolean default true,
  add column if not exists google_sync_to_employee boolean default false,
  add column if not exists google_move_on_reassign boolean default true;

-- 2. Jobs: Google event ids and sync status
alter table public.jobs
  add column if not exists google_company_event_id text,
  add column if not exists google_assigned_employee_event_id text,
  add column if not exists google_sync_status text default 'pending',
  add column if not exists google_last_synced_at timestamptz,
  add column if not exists google_last_sync_error text;

alter table public.jobs drop constraint if exists jobs_google_sync_status_check;
alter table public.jobs add constraint jobs_google_sync_status_check
  check (google_sync_status is null or google_sync_status in ('synced', 'pending', 'failed'));

-- 3. Profiles: optional employee calendar sync (for assigned tech)
alter table public.profiles
  add column if not exists google_calendar_id text,
  add column if not exists google_tokens_encrypted text,
  add column if not exists google_sync_enabled boolean default false;

-- 4. New permissions: add to owner and admin
insert into public.role_permissions (role_id, permission)
select r.id, p from public.roles r cross join lateral unnest(array[
  'integrations.view', 'integrations.manage', 'google.connect', 'google.disconnect', 'google.sync.retry'
]) as p
where r.key = 'owner' on conflict (role_id, permission) do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, p from public.roles r cross join lateral unnest(array[
  'integrations.view', 'integrations.manage', 'google.connect', 'google.disconnect', 'google.sync.retry'
]) as p
where r.key = 'admin' on conflict (role_id, permission) do nothing;
