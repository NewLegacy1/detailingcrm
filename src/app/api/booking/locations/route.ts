import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getNextAvailableSlot } from '@/lib/booking-availability'

/**
 * GET /api/booking/locations?slug=xxx&lat=...&lng=...
 * Returns active locations for the org (by slug). Optional lat/lng for distance and sort.
 * When multi_location_enabled and Pro, used by booking location step. Anon-safe.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() ?? ''
  const latParam = req.nextUrl.searchParams.get('lat')
  const lngParam = req.nextUrl.searchParams.get('lng')
  const pLat = latParam != null && latParam !== '' ? parseFloat(latParam) : null
  const pLng = lngParam != null && lngParam !== '' ? parseFloat(lngParam) : null

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: rows, error } = await supabase.rpc('get_public_booking_locations', {
    p_slug: slug,
    p_lat: pLat != null && !Number.isNaN(pLat) ? pLat : null,
    p_lng: pLng != null && !Number.isNaN(pLng) ? pLng : null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const locations = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    org_id: r.org_id,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    timezone: r.timezone,
    service_mode: r.service_mode,
    hours_start: r.hours_start,
    hours_end: r.hours_end,
    slot_interval_minutes: r.slot_interval_minutes,
    blackout_dates: r.blackout_dates ?? [],
    blackout_ranges: r.blackout_ranges,
    sort_order: r.sort_order,
    is_active: r.is_active,
    distance_km: r.distance_km != null ? Number(r.distance_km) : null,
    service_radius_km: r.service_radius_km != null ? Number(r.service_radius_km) : null,
  }))

  // When customer provided lat/lng, suggest a location if exactly one has them inside its service area
  let suggestedLocationId: string | null = null
  if (pLat != null && pLng != null && !Number.isNaN(pLat) && !Number.isNaN(pLng)) {
    const inServiceArea = locations.filter(
      (loc: { distance_km: number | null; service_radius_km: number | null }) =>
        loc.distance_km != null &&
        loc.service_radius_km != null &&
        loc.service_radius_km > 0 &&
        loc.distance_km <= loc.service_radius_km
    )
    if (inServiceArea.length === 1) suggestedLocationId = inServiceArea[0].id as string
  }

  const durationMins = 60
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const withNext: Array<Record<string, unknown>> = []
  for (const loc of locations) {
    const orgId = loc.org_id as string
    const locationId = loc.id as string
    let next_available: string | null = null
    try {
      next_available = await getNextAvailableSlot(
        supabase,
        { orgId, locationId, dateStr: todayStr, durationMins }
      )
    } catch (error) {
      console.error('[Booking Locations] Next available lookup failed:', {
        slug,
        orgId,
        locationId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    withNext.push({ ...loc, next_available })
  }

  return NextResponse.json({ locations: withNext, suggestedLocationId })
}
