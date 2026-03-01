-- Configurable email subjects for review follow-up and job reminder automations

alter table public.organizations
  add column if not exists review_request_subject text;

alter table public.organizations
  add column if not exists job_reminder_subject text;

comment on column public.organizations.review_request_subject is 'Subject line for review follow-up emails. Default in app: How was your experience?';
comment on column public.organizations.job_reminder_subject is 'Subject line for job reminder emails. Default in app: Appointment reminder';
