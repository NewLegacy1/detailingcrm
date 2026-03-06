import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST { token } — Accept invite: link current user to org and set role.
 * Requires auth. User's email must match invite email.
 */
export async function POST(request: NextRequest) {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const serviceSupabase = await createServiceRoleClient()
  const { data: invite, error: inviteError } = await serviceSupabase
    .from('team_invites')
    .select('id, org_id, email, role, expires_at')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: 'This invite was sent to a different email address' }, { status: 403 })
  }

  const { error: updateError } = await serviceSupabase
    .from('profiles')
    .update({
      org_id: invite.org_id,
      role: invite.role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await serviceSupabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true, orgId: invite.org_id })
}
