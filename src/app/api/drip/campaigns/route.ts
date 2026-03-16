import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

const ALLOWED_ROLES = ['owner', 'admin', 'manager'] as const

/** GET: list drip campaigns for current org */
export async function GET() {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(ALLOWED_ROLES as readonly string[]).includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const locationId = auth.locationId ?? null
  let query = supabase
    .from('drip_campaigns')
    .select('id, org_id, name, trigger_type, workflow_json, active, created_at, updated_at, location_id')
    .eq('org_id', auth.orgId)
    .order('updated_at', { ascending: false })
  if (locationId) query = query.eq('location_id', locationId)
  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/** POST: create a new drip campaign */
export async function POST(request: NextRequest) {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(ALLOWED_ROLES as readonly string[]).includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const trigger_type = body.trigger_type
  const workflow_json = body.workflow_json

  const validTriggers = ['job_paid', 'new_booking', 'abandoned_booking', 'job_completed', 'appointment_reminder']
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!validTriggers.includes(trigger_type)) {
    return NextResponse.json({ error: 'trigger_type must be one of: ' + validTriggers.join(', ') }, { status: 400 })
  }

  const locationId = auth.locationId ?? null
  const payload: Record<string, unknown> = {
    org_id: auth.orgId,
    name,
    trigger_type,
    workflow_json:
      workflow_json && typeof workflow_json === 'object' && Array.isArray(workflow_json.nodes)
        ? { nodes: workflow_json.nodes, edges: Array.isArray(workflow_json.edges) ? workflow_json.edges : [] }
        : { nodes: [], edges: [] },
    active: true,
  }
  if (locationId) payload.location_id = locationId

  const supabase = await createClient()

  let existingQuery = supabase
    .from('drip_campaigns')
    .select('id')
    .eq('org_id', auth.orgId)
    .eq('trigger_type', trigger_type)
    .eq('active', true)
  if (locationId) existingQuery = existingQuery.eq('location_id', locationId)
  else existingQuery = existingQuery.is('location_id', null)
  const { data: existing } = await existingQuery.limit(1).maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'You already have an active campaign for this trigger. Open it in the builder.', existing_id: existing.id },
      { status: 409 }
    )
  }

  const { data, error } = await supabase.from('drip_campaigns').insert(payload).select('id, org_id, name, trigger_type, workflow_json, active, created_at, updated_at, location_id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
