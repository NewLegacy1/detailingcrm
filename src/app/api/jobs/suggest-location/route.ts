import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { haversineDistanceKm } from '@/lib/utils'

const GEOCODE_KEY =
  (typeof process.env.GOOGLE_MAPS_API_KEY === 'string' && process.env.GOOGLE_MAPS_API_KEY.trim()) ||
  (typeof process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'string' && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.trim()) ||
  ''

/**
 * GET /api/jobs/suggest-location?address=...
 * Geocodes the address, then finds an org location whose service area contains it
 * (distance <= service_radius_km). Returns { location_id, location_name } or null.
 * Auth required.
 */
export async function GET(req: NextRequest) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const address = req.nextUrl.searchParams.get('address')?.trim()
  if (!address) {
    return NextResponse.json({ location_id: null, location_name: null })
  }

  let lat: number
  let lng: number

  if (GEOCODE_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GEOCODE_KEY}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== 'OK' || !data.results?.[0]) {
        return NextResponse.json({ location_id: null, location_name: null })
      }
      const loc = data.results[0].geometry?.location
      if (loc?.lat == null || loc?.lng == null) {
        return NextResponse.json({ location_id: null, location_name: null })
      }
      lat = Number(loc.lat)
      lng = Number(loc.lng)
    } catch {
      return NextResponse.json({ location_id: null, location_name: null })
    }
  } else {
    return NextResponse.json({ location_id: null, location_name: null })
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, lat, lng, service_radius_km')
    .eq('org_id', orgId)
    .eq('is_active', true)

  if (!locations?.length) {
    return NextResponse.json({ location_id: null, location_name: null })
  }

  const withDistance = locations
    .filter((loc) => loc.lat != null && loc.lng != null)
    .map((loc) => {
      const distanceKm = haversineDistanceKm(
        Number(loc.lat),
        Number(loc.lng),
        lat,
        lng
      )
      const radiusKm = loc.service_radius_km != null ? Number(loc.service_radius_km) : null
      return {
        id: loc.id,
        name: loc.name,
        distanceKm,
        inRange: radiusKm != null && radiusKm > 0 && distanceKm <= radiusKm,
      }
    })

  const inRange = withDistance.filter((x) => x.inRange)
  const chosen = inRange.length > 0
    ? inRange.sort((a, b) => a.distanceKm - b.distanceKm)[0]
    : null

  if (!chosen) {
    return NextResponse.json({ location_id: null, location_name: null })
  }

  return NextResponse.json({
    location_id: chosen.id,
    location_name: chosen.name,
  })
}
