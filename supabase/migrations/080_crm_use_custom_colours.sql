-- When true, CRM uses custom colours (accent/bg/text). When false, uses style preset only. Custom colour values are kept when switching to preset.
alter table public.organizations
  add column if not exists crm_use_custom_colours boolean default false;

-- Backfill: orgs that already have custom colours should show them
update public.organizations
set crm_use_custom_colours = true
where (crm_accent_color is not null and trim(crm_accent_color) != '')
   or (crm_bg_color is not null and trim(crm_bg_color) != '');
