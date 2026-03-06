import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { createClient } from '@/lib/supabase/server'
import sharp from 'sharp'

const FETCH_TIMEOUT_MS = 8000
const MAX_HTML_SIZE = 512 * 1024 // 512KB
const MAX_FAVICON_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const FAVICON_SIZE = 64

/**
 * Extract favicon URL from HTML by finding <link rel="icon"> or rel="shortcut icon".
 * Returns first match; href is returned as-is (caller must resolve relative to base).
 */
function extractFaviconFromHtml(html: string): string | null {
  const linkRe = /<link\s[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0]
    const relMatch = tag.match(/\brel\s*=\s*["']([^"']*)["']/i)
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)
    if (!relMatch || !hrefMatch) continue
    const rel = relMatch[1].toLowerCase().replace(/\s+/g, ' ').trim()
    const href = hrefMatch[1].trim()
    if (!href) continue
    if (rel === 'icon' || rel === 'shortcut icon') return href
  }
  return null
}

/** Return default DetailOps favicon as PNG (no redirect so browser gets 200 + image). */
async function serveDefaultFavicon(): Promise<NextResponse> {
  const logoPath = path.join(process.cwd(), 'public', 'detailopslogo.png')
  const buffer = await fs.readFile(logoPath)
  const resized = await sharp(buffer)
    .resize(FAVICON_SIZE, FAVICON_SIZE, {
      fit: 'contain',
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  return new NextResponse(new Uint8Array(resized), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  })
}

/**
 * GET /api/booking-favicon?slug=xxx
 * Returns 200 + image bytes (no redirects) so the tab icon always loads.
 * Tries: org website favicon → org logo resized → default DetailOps icon.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug || typeof slug !== 'string') {
    return serveDefaultFavicon()
  }
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    return serveDefaultFavicon()
  }

  const supabase = await createClient()
  const { data: raw } = await supabase.rpc('get_public_booking_context', { p_slug: normalizedSlug })
  const r = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const website = (r?.website as string | null)?.trim()
  const logoUrlRaw = r?.logoUrl ?? r?.logo_url
  const logoUrl = typeof logoUrlRaw === 'string' ? logoUrlRaw.trim() : null

  // Try website favicon first
  if (website) {
    let baseUrl: URL | null = null
    try {
      baseUrl = new URL(website.startsWith('http') ? website : `https://${website}`)
    } catch {
      // invalid website URL, skip
    }
    if (baseUrl && (baseUrl.protocol === 'https:' || baseUrl.protocol === 'http:')) {
      try {
        const res = await fetch(baseUrl.href, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DetailOpsBooking/1.0)' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
        if (res.ok) {
          const contentType = res.headers.get('content-type') ?? ''
          if (contentType.includes('text/html')) {
            const contentLength = res.headers.get('content-length')
            if (contentLength && parseInt(contentLength, 10) > MAX_HTML_SIZE) {
              // skip huge pages
            } else {
              const html = await res.text()
              if (html.length <= MAX_HTML_SIZE) {
                let faviconHref = extractFaviconFromHtml(html)
                // Many sites use /favicon.ico with no <link> tag
                if (!faviconHref) faviconHref = '/favicon.ico'
                let faviconUrl: URL | null = null
                try {
                  faviconUrl = new URL(faviconHref, baseUrl.href)
                } catch {
                  // invalid href
                }
                if (faviconUrl && (faviconUrl.protocol === 'https:' || faviconUrl.protocol === 'http:')) {
                  const favRes = await fetch(faviconUrl.href, {
                    headers: { Accept: 'image/*' },
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                  })
                  if (favRes.ok) {
                    const favType = favRes.headers.get('content-type') || 'image/x-icon'
                    const favLength = favRes.headers.get('content-length')
                    if (favLength && parseInt(favLength, 10) > MAX_FAVICON_SIZE) {
                      // skip
                    } else {
                      const buf = Buffer.from(await favRes.arrayBuffer())
                      if (buf.length <= MAX_FAVICON_SIZE) {
                        return new NextResponse(new Uint8Array(buf), {
                          headers: {
                            'Content-Type': favType.startsWith('image/') ? favType : 'image/x-icon',
                            'Cache-Control': 'public, max-age=86400',
                          },
                        })
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch {
        // fetch or parse failed, fall through to logo/default
      }
    }
  }

  // Fallback: logo-based favicon (fetch and resize here so we return 200 + image, no redirect)
  if (logoUrl) {
    const origin = request.nextUrl.origin
    const logoUrlAbs = logoUrl.startsWith('http') ? logoUrl : `${origin}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`
    let targetUrl: URL
    try {
      targetUrl = new URL(logoUrlAbs)
    } catch {
      return serveDefaultFavicon()
    }
    if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
      return serveDefaultFavicon()
    }
    try {
      const res = await fetch(targetUrl.href, {
        headers: { Accept: 'image/*' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!res.ok) throw new Error('Fetch failed')
      const contentType = res.headers.get('content-type') || 'image/png'
      if (!contentType.startsWith('image/')) throw new Error('Not an image')
      const contentLength = res.headers.get('content-length')
      if (contentLength && parseInt(contentLength, 10) > MAX_LOGO_SIZE) return serveDefaultFavicon()
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length > MAX_LOGO_SIZE) return serveDefaultFavicon()
      const resized = await sharp(buffer)
        .resize(FAVICON_SIZE, FAVICON_SIZE, {
          fit: 'contain',
          position: 'center',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
      return new NextResponse(new Uint8Array(resized), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      })
    } catch {
      // fall through to default
    }
  }

  return serveDefaultFavicon()
}
