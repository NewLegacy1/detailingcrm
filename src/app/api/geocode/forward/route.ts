import { NextRequest, NextResponse } from 'next/server'

const key =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'

/** GET /api/geocode/forward?address=... → { lat, lng } for multi-location booking geo step. */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim()
  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.[0]) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 })
  }
  const loc = data.results[0].geometry?.location
  if (loc?.lat == null || loc?.lng == null) {
    return NextResponse.json({ error: 'No coordinates' }, { status: 404 })
  }
  return NextResponse.json({ lat: Number(loc.lat), lng: Number(loc.lng) })
}
