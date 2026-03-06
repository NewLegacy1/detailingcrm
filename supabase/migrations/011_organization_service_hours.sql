-- Service hours (calendar display window) per organization.
-- Hours in 24h format: 9 = 9 AM, 18 = 6 PM.
alter table public.organizations
  add column if not exists service_hours_start int default 9,
  add column if not exists service_hours_end int default 18;

comment on column public.organizations.service_hours_start is 'Start hour for schedule display (0-23, default 9 = 9 AM)';
comment on column public.organizations.service_hours_end is 'End hour for schedule display (0-24, default 18 = 6 PM)';
