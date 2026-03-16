import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET() {
  const result = await requirePermission(PERMISSIONS.TEAM_VIEW)
  if ('error' in result) return result.error

  const supabase = await createClient()
  const { data: roles, error } = await supabase
    .from('roles')
    .select('id, name, key')
    .order('key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const roleIds = (roles ?? []).map((r) => r.id)
  const { data: perms } = await supabase
    .from('role_permissions')
    .select('role_id, permission')
    .in('role_id', roleIds)

  const permissionsByRole: Record<string, string[]> = {}
  for (const r of roles ?? []) {
    permissionsByRole[r.id] = (perms ?? []).filter((p) => p.role_id === r.id).map((p) => p.permission)
  }

  return NextResponse.json({
    roles: roles ?? [],
    permissionsByRole,
  })
}
