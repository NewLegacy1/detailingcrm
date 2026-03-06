import { NextRequest } from 'next/server'
import { haversineDistanceKm } from '@/lib/utils'

/** GET /api/booking/distance?fromLat=…&fromLng=…&toLat=…&toLng=…
 * Returns { distanceKm, durationMins } from org (from) to customer (to).
 * Uses Google Distance Matrix when API key is set; otherwise haversine + estimated drive time.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fromLat = Number(searchParams.get('fromLat'))
  const fromLng = Number(searchParams.get('fromLng'))
  const toLat = Number(searchParams.get('toLat'))
  const toLng = Number(searchParams.get('toLng'))

  if (
    Number.isNaN(fromLat) ||
    Number.isNaN(fromLng) ||
    Number.isNaN(toLat) ||
    Number.isNaN(toLng)
  ) {
    return Response.json(
      { error: 'Missing or invalid fromLat, fromLng, toLat, toLng' },
      { status: 400 }
    )
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (apiKey) {
    try {
      const origins = `${fromLat},${fromLng}`
      const destinations = `${toLat},${toLng}`
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=driving&units=metric&key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url)
      const data = (await res.json()) as {
        rows?: Array<{
          elements?: Array<{
            status: string
            distance?: { value: number }
            duration?: { value: number }
          }>
        }>
      }
      const element = data.rows?.[0]?.elements?.[0]
      if (element?.status === 'OK' && element.distance?.value != null && element.duration?.value != null) {
        const distanceKm = element.distance.value / 1000
        const durationMins = Math.round(element.duration.value / 60)
        return Response.json({ distanceKm, durationMins })
      }
    } catch (_) {
      // fall through to haversine
    }
  }

  const distanceKm = haversineDistanceKm(fromLat, fromLng, toLat, toLng)
  const durationMins = Math.max(1, Math.round((distanceKm / 40) * 60))
  return Response.json({ distanceKm, durationMins })
}
