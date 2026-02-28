-- Add text colour customisation columns to organisations

alter table public.organizations
  add column if not exists booking_text_color text,
  add column if not exists crm_text_color text;
