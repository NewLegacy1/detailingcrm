import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail } from '@/lib/notifications'
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

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const serviceSupabase = await createServiceRoleClient()

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
    token,
    expires_at: expiresAt.toISOString(),
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: org } = await serviceSupabase
    .from('organizations')
    .select('name')
    .eq('id', result.auth.orgId)
    .single()
  const orgName = org?.name ?? 'Your team'
  const joinUrl = getJoinUrl(token)
  const subject = `You're invited to join ${orgName} on DetailOps`
  const text = `${orgName} invited you to join their team on DetailOps as ${role}. Open this link to create your account or sign in and join:\n\n${joinUrl}\n\nThe link expires in ${EXPIRY_DAYS} days.`
  await sendEmail(email, subject, text)

  return NextResponse.json({ ok: true })
}
