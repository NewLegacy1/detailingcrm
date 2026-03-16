import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { allowProFeatures } from '@/lib/pro-features'

/** POST /api/locations/reorder — set sort_order by array of location ids. Pro only. */
export async function POST(req: NextRequest) {
  const result = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
  if ('error' in result) return result.error
  const orgId = result.auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()
  if (!allowProFeatures(org?.subscription_plan)) {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })
  }

  let body: { order?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const order = Array.isArray(body.order) ? body.order.filter((id): id is string => typeof id === 'string') : []
  if (order.length === 0) return NextResponse.json({ error: 'order array required' }, { status: 400 })

  for (let i = 0; i < order.length; i++) {
    const { error } = await supabase
      .from('locations')
      .update({ sort_order: i, updated_at: new Date().toISOString() })
      .eq('id', order[i])
      .eq('org_id', orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
