-- Multi-location: booking context scoped to a single location (same shape as get_public_booking_context).

create or replace function public.get_public_booking_context_for_location(p_slug text, p_location_id uuid)
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
  v_service_radius_km decimal;
  v_show_prices boolean;
  v_primary_color text;
  v_accent_color text;
  v_theme text;
  v_map_theme text;
  v_booking_text_color text;
  v_booking_header_text_color text;
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
  v_subscription_plan text;
  v_booking_payment_mode text;
  v_booking_payment_mode_public text;
  v_service_area_label text;
  v_service_mode text;
  v_service_mode_public text;
  v_shop_address text;
  v_website text;
  v_location_valid boolean;
  v_location_timezone text;
begin
  -- Resolve org and ensure location belongs to it
  select o.id, o.name, o.logo_url, o.booking_tagline, o.map_lat, o.map_lng, o.service_radius_km,
    coalesce(o.booking_show_prices, true),
    o.primary_color, o.accent_color, coalesce(o.theme, 'dark'),
    coalesce(o.map_theme, 'dark'),
    o.booking_text_color, o.booking_header_text_color,
    coalesce(o.timezone, 'America/Toronto'),
    coalesce(o.booking_payment_mode, 'none'),
    trim(o.booking_service_area_label),
    trim(o.website)
  into v_org_id, v_org_name, v_org_logo_url, v_tagline, v_map_lat, v_map_lng, v_service_radius_km,
    v_show_prices,
    v_primary_color, v_accent_color, v_theme, v_map_theme,
    v_booking_text_color, v_booking_header_text_color,
    v_timezone,
    v_booking_payment_mode,
    v_service_area_label,
    v_website
  from public.organizations o
  where o.booking_slug = nullif(trim(lower(p_slug)), '')
  limit 1;

  if v_org_id is null then
    return null;
  end if;

  select exists (select 1 from public.locations l where l.id = p_location_id and l.org_id = v_org_id and l.is_active = true)
  into v_location_valid;
  if not v_location_valid then
    return null;
  end if;

  -- Override with location's schedule and map
  select loc.lat, loc.lng, loc.hours_start, loc.hours_end, loc.slot_interval_minutes,
    coalesce(loc.blackout_dates, '{}'), loc.blackout_ranges,
    loc.service_mode, loc.address, loc.timezone
  into v_map_lat, v_map_lng, v_hours_start, v_hours_end, v_slot_interval,
    v_blackout_dates, v_blackout_ranges,
    v_service_mode, v_shop_address, v_location_timezone
  from public.locations loc
  where loc.id = p_location_id;

  v_shop_address := trim(v_shop_address);
  if v_service_mode in ('shop', 'both') then
    v_service_mode_public := v_service_mode;
  else
    v_service_mode_public := 'mobile';
  end if;

  select o.subscription_plan into v_subscription_plan from public.organizations o where o.id = v_org_id;
  if v_subscription_plan = 'pro' and v_booking_payment_mode in ('deposit', 'card_on_file') then
    v_booking_payment_mode_public := v_booking_payment_mode;
  else
    v_booking_payment_mode_public := 'none';
  end if;

  if v_subscription_plan = 'starter' then
    v_primary_color := null;
    v_accent_color := null;
    v_org_logo_url := '/detailopslogo.png';
  end if;

  select p.business_name, p.avatar_url
  into v_business_name, v_avatar_url
  from public.profiles p
  where p.org_id = v_org_id and p.role = 'owner'
  limit 1;

  -- Services: only those offered at this location; use price_override when set
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'duration_mins', s.duration_mins,
        'base_price', coalesce(ls.price_override, s.base_price),
        'description', s.description,
        'category', sc.name,
        'category_sort_order', sc.sort_order,
        'sort_order', coalesce(s.sort_order, 0),
        'photo_urls', coalesce(s.photo_urls, '[]'::jsonb),
        'size_prices', coalesce(
          ( select jsonb_agg(jsonb_build_object('size_key', sp.size_key, 'label', sp.label, 'price_offset', sp.price_offset) order by sp.size_key)
            from public.service_size_prices sp where sp.service_id = s.id ),
          '[]'::jsonb
        )
      )
      order by sc.sort_order nulls last, s.sort_order, s.name
    ),
    '[]'::jsonb
  )
  into v_services
  from public.services s
  inner join public.location_services ls on ls.service_id = s.id and ls.location_id = p_location_id and ls.is_offered = true
  left join public.service_categories sc on sc.id = s.category_id
  where s.org_id = v_org_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'price', u.price,
        'category', u.category,
        'icon_url', u.icon_url,
        'service_ids', coalesce(to_jsonb(u.service_ids), '[]'::jsonb)
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
    'serviceRadiusKm', v_service_radius_km,
    'showPrices', v_show_prices,
    'primaryColor', v_primary_color,
    'accentColor', v_accent_color,
    'theme', v_theme,
    'mapTheme', v_map_theme,
    'bookingTextColor', v_booking_text_color,
    'bookingHeaderTextColor', v_booking_header_text_color,
    'timezone', coalesce(v_location_timezone, v_timezone),
    'serviceHoursStart', v_hours_start,
    'serviceHoursEnd', v_hours_end,
    'bookingSlotIntervalMinutes', v_slot_interval,
    'blackoutDates', coalesce(v_blackout_dates, '{}'),
    'blackoutRanges', v_blackout_ranges,
    'bookingPaymentMode', v_booking_payment_mode_public,
    'serviceAreaLabel', v_service_area_label,
    'serviceMode', v_service_mode_public,
    'shopAddress', v_shop_address,
    'website', v_website,
    'services', v_services,
    'upsells', coalesce(v_upsells, '[]'::jsonb)
  );
end;
$$;

comment on function public.get_public_booking_context_for_location(text, uuid) is 'Returns public booking context scoped to one location (hours, map, services offered there). Anon may execute.';

grant execute on function public.get_public_booking_context_for_location(text, uuid) to anon;
grant execute on function public.get_public_booking_context_for_location(text, uuid) to authenticated;
