import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { getGoogleAuthUrl } from '@/lib/google-calendar'
import crypto from 'crypto'

export async function POST() {
  const result = await requirePermission(PERMISSIONS.GOOGLE_CONNECT)
  if ('error' in result) return result.error

  const supabase = await createClient()
  let orgId = result.auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const state = crypto.randomBytes(24).toString('base64url')
  const cookieStore = await cookies()
  cookieStore.set('google_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' })

  try {
    const url = getGoogleAuthUrl(state)
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Google not configured' }, { status: 400 })
  }
}
