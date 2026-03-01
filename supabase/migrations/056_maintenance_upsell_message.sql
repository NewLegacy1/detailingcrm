-- Custom message template for maintenance upsell emails
alter table public.organizations
  add column if not exists maintenance_upsell_message text;

comment on column public.organizations.maintenance_upsell_message is 'Custom email template for maintenance follow-up. Supports {{name}}, {{maintenanceUrl}}, etc.';
