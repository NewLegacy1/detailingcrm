import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET() {
  const result = await requirePermission(PERMISSIONS.TEAM_VIEW)
  if ('error' in result) return result.error
  if (!result.auth.orgId) return NextResponse.json([])

  const supabase = await createAuthClient()
  const { data: invites, error } = await supabase
    .from('team_invites')
    .select('id, email, role, expires_at, created_at')
    .eq('org_id', result.auth.orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(invites ?? [])
}
