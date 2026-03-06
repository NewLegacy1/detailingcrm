import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const FAVICON_SIZE = 64

/**
 * Serves the org's profile logo as a desktop favicon.
 * Format (same as public/detailops favicon new.svg): full logo contained in
 * 64x64, centered, transparent background — never crop to a part of the logo.
 * GET /api/favicon?url=<encoded-image-url>
 */
export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url')
  if (!urlParam || typeof urlParam !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }
  let targetUrl: URL
  try {
    targetUrl = new URL(decodeURIComponent(urlParam.trim()))
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
  if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
  }
  const isHttps = targetUrl.protocol === 'https:'
  const isLocalHttp =
    targetUrl.protocol === 'http:' &&
    (targetUrl.hostname === 'localhost' || targetUrl.hostname === '127.0.0.1')
  if (!isHttps && !isLocalHttp) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 })
  }
  try {
    const res = await fetch(targetUrl.href, {
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error('Fetch failed')
    const contentType = res.headers.get('content-type') || 'image/png'
    if (!contentType.startsWith('image/')) throw new Error('Not an image')
    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }
    // Full logo in frame, centered, transparent (no crop) — matches detailops favicon new.svg
    const resized = await sharp(buffer)
      .resize(FAVICON_SIZE, FAVICON_SIZE, {
        fit: 'contain',
        position: 'center',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
    return new NextResponse(new Uint8Array(resized), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.redirect(new URL('/detailopslogo.png', request.url))
  }
}
