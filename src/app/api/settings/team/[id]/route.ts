import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

const ALLOWED_ROLES = ['owner', 'admin', 'manager', 'technician', 'pending']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(PERMISSIONS.TEAM_MANAGE)
  if ('error' in result) return result.error

  const { id } = await params
  const body = await request.json()
  const newRole = body.role
  if (!newRole || !ALLOWED_ROLES.includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = await createAuthClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (profile.role === 'owner' && newRole !== 'owner') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot demote the last owner. Assign another owner first.' },
        { status: 400 }
      )
    }
  }

  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('key', newRole)
    .single()

  const update: { role: string; role_id?: string | null } = { role: newRole }
  if (roleRow) update.role_id = roleRow.id

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
