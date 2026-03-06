-- Public booking URL, org scheduling, branding, job source/UTM (additive)

-- 1. Organizations: booking slug (unique per org)
alter table public.organizations
  add column if not exists booking_slug text;

-- Backfill: unique slug per org (org-<uuid> so no collisions)
update public.organizations
set booking_slug = 'org-' || replace(id::text, '-', '')
where booking_slug is null;

create unique index if not exists idx_organizations_booking_slug on public.organizations(booking_slug);
alter table public.organizations alter column booking_slug set not null;

-- 2. Organizations: timezone and scheduling
alter table public.organizations
  add column if not exists timezone text default 'America/Toronto',
  add column if not exists booking_slot_interval_minutes int default 30,
  add column if not exists min_notice_minutes int default 120,
  add column if not exists max_days_in_advance int default 30,
  add column if not exists allow_same_day_bookings boolean default true,
  add column if not exists setup_buffer_minutes int default 15,
  add column if not exists cleanup_buffer_minutes int default 15,
  add column if not exists travel_buffer_minutes int default 20,
  add column if not exists service_radius_km decimal(10,2) default null,
  add column if not exists auto_assign_at_booking boolean default false,
  add column if not exists allow_unassigned_bookings boolean default true,
  add column if not exists business_hours jsonb default null,
  add column if not exists blackout_dates date[] default '{}',
  add column if not exists blackout_ranges jsonb default null;

-- 3. Organizations: branding
alter table public.organizations
  add column if not exists logo_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists accent_color text,
  add column if not exists theme text default 'dark',
  add column if not exists booking_display_name text,
  add column if not exists booking_tagline text,
  add column if not exists booking_contact_phone text,
  add column if not exists booking_contact_email text,
  add column if not exists booking_service_area_label text,
  add column if not exists booking_show_prices boolean default true,
  add column if not exists booking_require_address_before_times boolean default true,
  add column if not exists booking_require_deposit boolean default false,
  add column if not exists booking_allow_quote_request boolean default false;

-- 4. Jobs: source and UTM
alter table public.jobs
  add column if not exists source text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

-- 5. Service upsells: add-on duration for slot calc
alter table public.service_upsells
  add column if not exists duration_mins int default 0;
