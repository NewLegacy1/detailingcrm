import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

const ALLOWED_ROLES = ['owner', 'admin', 'manager'] as const

/** PATCH: update campaign (workflow_json, name, active) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(ALLOWED_ROLES as readonly string[]).includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Campaign id required' }, { status: 400 })

  const body = await request.json()
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.name === 'string') upd.name = body.name.trim()
  if (typeof body.active === 'boolean') upd.active = body.active
  if (body.workflow_json && typeof body.workflow_json === 'object' && Array.isArray(body.workflow_json.nodes)) {
    upd.workflow_json = {
      nodes: body.workflow_json.nodes,
      edges: Array.isArray(body.workflow_json.edges) ? body.workflow_json.edges : [],
    }
    const triggerNode = (body.workflow_json.nodes as { id: string; type: string; data?: { triggerType?: string } }[]).find(
      (n: { type: string }) => n.type === 'trigger'
    )
    if (triggerNode?.data?.triggerType && typeof triggerNode.data.triggerType === 'string') {
      upd.trigger_type = triggerNode.data.triggerType
    }
  }

  const supabase = await createClient()
  let updateQuery = supabase
    .from('drip_campaigns')
    .update(upd)
    .eq('id', id)
    .eq('org_id', auth.orgId)
  if (auth.locationId) updateQuery = updateQuery.eq('location_id', auth.locationId)
  const { data, error } = await updateQuery
    .select('id, org_id, name, trigger_type, workflow_json, active, created_at, updated_at, location_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json(data)
}
