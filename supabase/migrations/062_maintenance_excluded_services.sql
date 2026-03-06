-- Allow excluding specific services from maintenance upsell emails (e.g. ceramic coating).

alter table public.organizations
  add column if not exists maintenance_upsell_excluded_service_ids uuid[] default '{}';

comment on column public.organizations.maintenance_upsell_excluded_service_ids is 'Service IDs that should not receive maintenance follow-up emails (e.g. ceramic coating). Empty = all services get emails.';
