import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { exchangeCodeForTokens, listCalendars } from '@/lib/google-calendar'
import { encrypt } from '@/lib/token-encryption'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const redirectTo = `${baseUrl}/settings/integrations`

  if (errorParam) {
    return NextResponse.redirect(`${redirectTo}?google_error=${encodeURIComponent(errorParam)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectTo}?google_error=missing_code_or_state`)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('google_oauth_state')?.value
  cookieStore.delete('google_oauth_state')

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${redirectTo}?google_error=invalid_state`)
  }

  const auth = await getAuthAndPermissions()
  if (!auth || !hasPermission(auth.permissions, PERMISSIONS.GOOGLE_CONNECT)) {
    return NextResponse.redirect(`${redirectTo}?google_error=unauthorized`)
  }

  const supabase = await createClient()
  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) {
    return NextResponse.redirect(`${redirectTo}?google_error=no_org`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const encrypted = encrypt(JSON.stringify(tokens))
    await supabase
      .from('organizations')
      .update({
        google_tokens_encrypted: encrypted,
        google_token_meta: { expiry_date: tokens.expiry_date },
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    // Auto-select a calendar so Schedule and events work immediately: primary calendar, or first in list
    try {
      const calendars = await listCalendars(encrypted)
      const toSelect = calendars.find((c) => c.primary) ?? calendars[0]
      if (toSelect?.id) {
        await supabase
          .from('organizations')
          .update({
            google_company_calendar_id: toSelect.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orgId)
      }
    } catch {
      // Non-fatal: user can still choose a calendar in Settings → Schedule
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Token exchange failed'
    return NextResponse.redirect(`${redirectTo}?google_error=${encodeURIComponent(message)}`)
  }

  return NextResponse.redirect(`${redirectTo}?google_connected=1`)
}
