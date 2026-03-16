-- CRM style preset: midnight (default), carbon, frost

alter table public.organizations
  add column if not exists crm_style_preset text default 'midnight' check (crm_style_preset in ('midnight', 'carbon', 'frost'));
