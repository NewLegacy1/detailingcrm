import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** If request has auth recovery params (password reset link), redirect to /auth/callback immediately so user never sees landing. */
function redirectAuthRecovery(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname
  const search = request.nextUrl.searchParams
  const hasCode = search.has('code')
  const hasTokenHash = search.has('token_hash')
  const hasType = search.has('type')
  const hasRecoveryParams = hasCode || (hasTokenHash && hasType)
  const isLandingOrLogin = pathname === '/' || pathname === '/login'
  const isAuthReset = pathname === '/auth/reset'
  if ((isLandingOrLogin || isAuthReset) && hasRecoveryParams) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    if (!url.searchParams.has('flow')) url.searchParams.set('flow', 'recovery')
    return NextResponse.redirect(url)
  }
  return null
}

export async function middleware(request: NextRequest) {
  const authRedirect = redirectAuthRecovery(request)
  if (authRedirect) return authRedirect
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/icon|api/default-icon|api/booking-favicon|api/favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
