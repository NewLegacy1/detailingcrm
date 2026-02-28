import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Main app domain (e.g. app.yourapp.com). Requests to other hosts may be custom booking domains. */
function getMainAppHost(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const mainHost = getMainAppHost()
  const requestHost = request.headers.get('host') ?? ''

  if (mainHost && requestHost !== mainHost && supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: { getAll: () => [], setAll: () => {} },
      }
    )
    const { data: slug } = await supabase.rpc('get_booking_slug_for_domain', {
      domain: requestHost,
    })
    if (slug && typeof slug === 'string') {
      const url = request.nextUrl.clone()
      url.pathname = `/book/${encodeURIComponent(slug)}`
      return NextResponse.rewrite(url)
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  if (pathname === '/') {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/crm/dashboard', request.url))
    }
    // Guest: serve the restored marketing landing (public/index.html)
    return NextResponse.rewrite(new URL('/index.html', request.url))
  }

  /* Auth disabled for testing: no redirect to login */
  return supabaseResponse
}
