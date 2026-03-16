-- Expose service_radius_km from get_public_booking_locations so booking can auto-select location when address is in service area.
create or replace function public.get_public_booking_locations(
  p_slug text,
  p_lat decimal default null,
  p_lng decimal default null
)
returns table (
  id uuid,
  org_id uuid,
  name text,
  address text,
  lat decimal,
  lng decimal,
  timezone text,
  service_mode text,
  hours_start int,
  hours_end int,
  slot_interval_minutes int,
  blackout_dates date[],
  blackout_ranges jsonb,
  sort_order int,
  is_active boolean,
  distance_km decimal,
  service_radius_km decimal
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_org_id uuid;
  v_lat float;
  v_lng float;
begin
  select o.id into v_org_id
  from public.organizations o
  where o.booking_slug = nullif(trim(lower(p_slug)), '')
  limit 1;

  if v_org_id is null then
    return;
  end if;

  v_lat := p_lat::float;
  v_lng := p_lng::float;

  return query
  select
    l.id,
    l.org_id,
    l.name,
    l.address,
    l.lat,
    l.lng,
    l.timezone,
    l.service_mode,
    l.hours_start,
    l.hours_end,
    l.slot_interval_minutes,
    coalesce(l.blackout_dates, '{}'),
    l.blackout_ranges,
    l.sort_order,
    l.is_active,
    case
      when p_lat is not null and p_lng is not null and l.lat is not null and l.lng is not null
      then round((6371 * acos(least(1, greatest(-1,
        cos(radians(v_lat)) * cos(radians(l.lat::float)) * cos(radians(l.lng::float) - radians(v_lng))
        + sin(radians(v_lat)) * sin(radians(l.lat::float))
      )))))::decimal(10, 2)
      else null
    end as distance_km,
    l.service_radius_km
  from public.locations l
  where l.org_id = v_org_id
    and l.is_active = true
  order by
    case when p_lat is not null and p_lng is not null and l.lat is not null and l.lng is not null
      then 6371 * acos(least(1, greatest(-1,
        cos(radians(v_lat)) * cos(radians(l.lat::float)) * cos(radians(l.lng::float) - radians(v_lng))
        + sin(radians(v_lat)) * sin(radians(l.lat::float))
      )))
      else 999999
    end,
    l.sort_order,
    l.name;
end;
$$;

comment on function public.get_public_booking_locations(text, decimal, decimal) is 'Returns active locations for org by booking slug; optional lat/lng for distance_km, service_radius_km, and sort by nearest. Anon may execute.';
