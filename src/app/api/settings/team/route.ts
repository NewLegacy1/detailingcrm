import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET() {
  const result = await requirePermission(PERMISSIONS.TEAM_VIEW)
  if ('error' in result) return result.error
  if (!result.auth.orgId) return NextResponse.json([])

  const supabase = await createAuthClient()
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, role, display_name, created_at, updated_at')
    .eq('org_id', result.auth.orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(profiles ?? [])
}
