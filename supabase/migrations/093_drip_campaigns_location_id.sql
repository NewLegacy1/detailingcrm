-- Drip campaigns: optional location scope. When set, campaign runs only for jobs/customers at that location.
-- Null = org-wide (legacy / single-location).

alter table public.drip_campaigns
  add column if not exists location_id uuid references public.locations(id) on delete set null;

create index if not exists idx_drip_campaigns_location_id on public.drip_campaigns(location_id);

comment on column public.drip_campaigns.location_id is 'When set, this campaign only runs for jobs/customers at this location. Null = org-wide.';
