import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function PATCH(request: NextRequest) {
  const result = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE)
  if ('error' in result) return result.error

  const body = await request.json().catch(() => ({}))
  const syncToCompany = body.syncToCompany as boolean | undefined
  const syncToEmployee = body.syncToEmployee as boolean | undefined
  const moveOnReassign = body.moveOnReassign as boolean | undefined

  const supabase = await createClient()
  let orgId = result.auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof syncToCompany === 'boolean') updates.google_sync_to_company = syncToCompany
  if (typeof syncToEmployee === 'boolean') updates.google_sync_to_employee = syncToEmployee
  if (typeof moveOnReassign === 'boolean') updates.google_move_on_reassign = moveOnReassign

  const { error } = await supabase.from('organizations').update(updates).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
