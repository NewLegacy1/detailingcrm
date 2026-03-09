import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET ?token=... — Validate invite token and return email, orgName, role for the join page.
 * No auth required.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token?.trim()) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: invite, error } = await supabase
    .from('team_invites')
    .select('id, email, role, org_id, location_id, expires_at')
    .eq('token', token.trim())
    .is('accepted_at', null)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }

  const [orgRes, locationRes] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', invite.org_id).single(),
    invite.location_id
      ? supabase.from('locations').select('name').eq('id', invite.location_id).single()
      : Promise.resolve({ data: null }),
  ])
  const org = orgRes.data
  const location = locationRes.data

  return NextResponse.json({
    email: invite.email,
    orgName: org?.name ?? 'The team',
    role: invite.role,
    locationId: invite.location_id ?? undefined,
    locationName: location?.name ?? undefined,
  })
}
