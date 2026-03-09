-- Location manager assignment and per-location Google Calendar.
-- 1. profiles.location_id: when set, user is scoped to that location (location manager).
-- 2. team_invites.location_id: owner can invite a manager for a specific location.
-- 3. locations.google_calendar_id: optional calendar per location (same org Google account).

-- profiles: optional location assignment for location managers
alter table public.profiles
  add column if not exists location_id uuid references public.locations(id) on delete set null;

comment on column public.profiles.location_id is 'When set, user is a location manager and only sees data for this location.';

-- team_invites: optional location for manager invites
alter table public.team_invites
  add column if not exists location_id uuid references public.locations(id) on delete set null;

comment on column public.team_invites.location_id is 'When set with role=manager, invitee becomes a location manager for this location.';

-- locations: optional Google Calendar ID (uses org Google tokens)
alter table public.locations
  add column if not exists google_calendar_id text;

comment on column public.locations.google_calendar_id is 'Optional Google Calendar ID for this location; uses org Google connection. When set, jobs at this location sync to this calendar.';
