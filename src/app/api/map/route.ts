import { NextRequest, NextResponse } from 'next/server'

const key =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY

/**
 * GET /api/map?address=... → static map image with a pin at the address.
 * Proxies Google Maps Static API so the key stays server-side.
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  if (!address || typeof address !== 'string' || !address.trim()) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }
  if (!key) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured (GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)' },
      { status: 503 }
    )
  }

  const encoded = encodeURIComponent(address.trim())
  const width = Math.min(800, Math.max(200, Number(request.nextUrl.searchParams.get('w')) || 415))
  const height = Math.min(400, Math.max(100, Number(request.nextUrl.searchParams.get('h')) || 150))
  const size = `${Math.round(width)}x${Math.round(height)}`
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=15&size=${size}&markers=color:red%7C${encoded}&key=${key}`

  const res = await fetch(url, { cache: 'force-cache', next: { revalidate: 86400 } })
  if (!res.ok) {
    return NextResponse.json(
      { error: 'Map service unavailable' },
      { status: 502 }
    )
  }

  const contentType = res.headers.get('content-type') || 'image/png'
  const body = await res.arrayBuffer()
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
