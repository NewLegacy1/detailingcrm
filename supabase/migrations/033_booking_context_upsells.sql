-- Add upsells (add-ons) to public booking context for add-on selection during booking

create or replace function public.get_public_booking_context(p_slug text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_name text;
  v_org_logo_url text;
  v_tagline text;
  v_map_lat decimal;
  v_map_lng decimal;
  v_show_prices boolean;
  v_business_name text;
  v_avatar_url text;
  v_timezone text;
  v_hours_start int;
  v_hours_end int;
  v_slot_interval int;
  v_blackout_dates date[];
  v_blackout_ranges jsonb;
  v_services jsonb;
  v_upsells jsonb;
begin
  select id, name, logo_url, booking_tagline, map_lat, map_lng, coalesce(booking_show_prices, true),
    coalesce(timezone, 'America/Toronto'),
    coalesce(service_hours_start, 9),
    coalesce(service_hours_end, 18),
    coalesce(booking_slot_interval_minutes, 30),
    coalesce(blackout_dates, '{}'),
    blackout_ranges
  into v_org_id, v_org_name, v_org_logo_url, v_tagline, v_map_lat, v_map_lng, v_show_prices,
    v_timezone, v_hours_start, v_hours_end, v_slot_interval, v_blackout_dates, v_blackout_ranges
  from public.organizations
  where booking_slug = nullif(trim(lower(p_slug)), '')
  limit 1;

  if v_org_id is null then
    return null;
  end if;

  select p.business_name, p.avatar_url
  into v_business_name, v_avatar_url
  from public.profiles p
  where p.org_id = v_org_id and p.role = 'owner'
  limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'duration_mins', s.duration_mins,
        'base_price', s.base_price,
        'description', s.description,
        'size_prices', coalesce(
          ( select jsonb_agg(jsonb_build_object('size_key', sp.size_key, 'label', sp.label, 'price_offset', sp.price_offset) order by sp.size_key)
            from public.service_size_prices sp where sp.service_id = s.id ),
          '[]'::jsonb
        )
      )
      order by s.name
    ),
    '[]'::jsonb
  )
  into v_services
  from public.services s
  where s.org_id = v_org_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'price', u.price,
        'category', u.category
      )
      order by u.category, u.sort_order, u.name
    ),
    '[]'::jsonb
  )
  into v_upsells
  from public.service_upsells u
  where u.org_id = v_org_id;

  return jsonb_build_object(
    'businessName', trim(coalesce(v_business_name, v_org_name, 'Book')),
    'logoUrl', coalesce(v_org_logo_url, v_avatar_url),
    'tagline', v_tagline,
    'mapLat', v_map_lat,
    'mapLng', v_map_lng,
    'showPrices', v_show_prices,
    'timezone', v_timezone,
    'serviceHoursStart', v_hours_start,
    'serviceHoursEnd', v_hours_end,
    'bookingSlotIntervalMinutes', v_slot_interval,
    'blackoutDates', coalesce(v_blackout_dates, '{}'),
    'blackoutRanges', v_blackout_ranges,
    'services', v_services,
    'upsells', coalesce(v_upsells, '[]'::jsonb)
  );
end;
$$;

comment on function public.get_public_booking_context is 'Returns public booking page context by booking_slug (org, profile, services with size_prices, upsells, scheduling). Anon may execute.';
