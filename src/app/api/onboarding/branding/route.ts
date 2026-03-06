import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** PATCH: update organization branding (primary_color, accent_color for booking page; optional logo). */
export async function PATCH(request: NextRequest) {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await authClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.logo_url === 'string' || body.logo_url === null) updates.logo_url = body.logo_url
  if (typeof body.primary_color === 'string' || body.primary_color === null) updates.primary_color = body.primary_color
  if (typeof body.accent_color === 'string' || body.accent_color === null) updates.accent_color = body.accent_color
  // Set theme from primary colour so booking page shows readable text (light vs dark preset)
  if (typeof body.primary_color === 'string' && body.primary_color.trim()) {
    const hex = body.primary_color.trim().replace(/^#/, '')
    const m = hex.match(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    if (m) {
      const s = m[1]
      const r = s.length === 3 ? parseInt(s[0] + s[0], 16) : parseInt(s.slice(0, 2), 16)
      const g = s.length === 3 ? parseInt(s[1] + s[1], 16) : parseInt(s.slice(2, 4), 16)
      const b = s.length === 3 ? parseInt(s[2] + s[2], 16) : parseInt(s.slice(4, 6), 16)
      const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      updates.theme = L > 0.5 ? 'light' : 'dark'
    }
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ ok: true })
  }

  try {
    const supabase = await createServiceRoleClient()
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', profile.org_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    const { error } = await authClient
      .from('organizations')
      .update(updates)
      .eq('id', profile.org_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }
}
