import { NextRequest, NextResponse } from 'next/server'

const key =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'

/** GET /api/geocode/reverse?lat=43.2557&lng=-79.8711 → { formatted_address } */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')
  const numLat = lat ? parseFloat(lat) : NaN
  const numLng = lng ? parseFloat(lng) : NaN
  if (Number.isNaN(numLat) || Number.isNaN(numLng)) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${numLat},${numLng}&key=${key}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.[0]) {
    return NextResponse.json({ formatted_address: null })
  }
  return NextResponse.json({
    formatted_address: data.results[0].formatted_address ?? null,
  })
}
