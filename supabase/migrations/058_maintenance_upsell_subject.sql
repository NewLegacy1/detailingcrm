-- Configurable subject line for maintenance upsell emails

alter table public.organizations
  add column if not exists maintenance_upsell_subject text;

comment on column public.organizations.maintenance_upsell_subject is 'Subject line for maintenance follow-up emails. Default in app: Time for your next detail?';
