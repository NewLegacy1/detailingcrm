import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'
import { randomBytes } from 'crypto'

const INVITE_ROLES = ['admin', 'manager', 'technician'] as const
const TOKEN_BYTES = 32
const EXPIRY_DAYS = 7

function getJoinUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base}/signup/join?token=${encodeURIComponent(token)}`
}

export async function POST(request: NextRequest) {
  const result = await requirePermission(PERMISSIONS.TEAM_MANAGE)
  if ('error' in result) return result.error
  if (!result.auth.orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = typeof body.role === 'string' && (INVITE_ROLES as readonly string[]).includes(body.role)
    ? body.role
    : 'technician'
  let locationId: string | null = typeof body.location_id === 'string' && body.location_id.trim() ? body.location_id.trim() : null

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const serviceSupabase = await createServiceRoleClient()
  const { data: orgFlags } = await serviceSupabase
    .from('organizations')
    .select('multi_location_enabled')
    .eq('id', result.auth.orgId)
    .single()
  const multiLocationEnabled = orgFlags?.multi_location_enabled === true
  if (multiLocationEnabled && (role === 'manager' || role === 'technician') && !locationId) {
    return NextResponse.json(
      { error: 'When multi-location is enabled, managers and technicians must be assigned to a location.' },
      { status: 400 }
    )
  }

  if (locationId) {
    const { data: loc } = await serviceSupabase
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('org_id', result.auth.orgId)
      .eq('is_active', true)
      .single()
    if (!loc) {
      return NextResponse.json({ error: 'Invalid or inactive location' }, { status: 400 })
    }
  }

  const { data: existingInvite } = await serviceSupabase
    .from('team_invites')
    .select('id')
    .eq('org_id', result.auth.orgId)
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (existingInvite) {
    return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 409 })
  }

  const token = randomBytes(TOKEN_BYTES).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS)

  const { error: insertError } = await serviceSupabase.from('team_invites').insert({
    org_id: result.auth.orgId,
    email,
    role,
    location_id: locationId || null,
    token,
    expires_at: expiresAt.toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: org } = await serviceSupabase
    .from('organizations')
    .select('name, booking_slug')
    .eq('id', result.auth.orgId)
    .single()
  const orgName = org?.name ?? 'Your team'
  const joinUrl = getJoinUrl(token)
  const subject = `You're invited to join ${orgName} on DetailOps`
  const text = `${orgName} invited you to join their team on DetailOps as ${role}. Open this link to create your account or sign in and join:\n\n${joinUrl}\n\nThe link expires in ${EXPIRY_DAYS} days.`
  const fromAddr = getFromAddressForSlug(org?.booking_slug)
  const sendResult = await sendEmail(email, subject, text, undefined, fromAddr)

  if (!sendResult.ok) {
    await serviceSupabase.from('team_invites').delete().eq('org_id', result.auth.orgId).eq('email', email).eq('token', token)
    return NextResponse.json(
      { error: sendResult.error ?? 'Failed to send invite email. Check Settings → Notifications: set Resend (RESEND_API_KEY) and a from-address (NOTIFICATION_EMAIL_DOMAIN or RESEND_FROM_EMAIL).' },
      { status: 503 }
    )
  }

  return NextResponse.json({ ok: true })
}
