-- Per-organization CRM colours (applied when user is in CRM; null = use app defaults)

alter table public.organizations
  add column if not exists crm_accent_color text,
  add column if not exists crm_bg_color text,
  add column if not exists crm_surface_color text;

comment on column public.organizations.crm_accent_color is 'CRM accent colour (e.g. buttons, links); null = default blue';
comment on column public.organizations.crm_bg_color is 'CRM background colour; null = default dark';
comment on column public.organizations.crm_surface_color is 'CRM surface/card colour; null = default';
