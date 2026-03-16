-- Public booking context: anon can load booking page by slug (org + owner profile + services)

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
  v_services jsonb;
begin
  select id, name, logo_url, booking_tagline, map_lat, map_lng, coalesce(booking_show_prices, true)
  into v_org_id, v_org_name, v_org_logo_url, v_tagline, v_map_lat, v_map_lng, v_show_prices
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
        'description', s.description
      )
      order by s.name
    ),
    '[]'::jsonb
  )
  into v_services
  from public.services s
  where s.org_id = v_org_id;

  return jsonb_build_object(
    'businessName', trim(coalesce(v_business_name, v_org_name, 'Book')),
    'logoUrl', coalesce(v_org_logo_url, v_avatar_url),
    'tagline', v_tagline,
    'mapLat', v_map_lat,
    'mapLng', v_map_lng,
    'showPrices', v_show_prices,
    'services', v_services
  );
end;
$$;

comment on function public.get_public_booking_context is 'Returns public booking page context by booking_slug. Used by /book/[slug]. Anon may execute.';

grant execute on function public.get_public_booking_context(text) to anon;
grant execute on function public.get_public_booking_context(text) to authenticated;
