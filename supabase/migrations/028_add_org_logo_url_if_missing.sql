-- Ensure organizations has logo_url (used by booking page and RPC)

alter table public.organizations
  add column if not exists logo_url text;

comment on column public.organizations.logo_url is 'Logo URL for branding/booking. Booking page uses this or owner profile avatar_url.';
