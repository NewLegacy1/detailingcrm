import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { allowProFeatures } from '@/lib/pro-features'

async function getOrgIdAndEnsurePro(supabase: Awaited<ReturnType<typeof createClient>>) {
  const result = await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  if ('error' in result) return { error: result.error as NextResponse }
  const orgId = result.auth.orgId
  if (!orgId) return { error: NextResponse.json({ error: 'No organization' }, { status: 400 }) }
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()
  if (!allowProFeatures(org?.subscription_plan)) {
    return { error: NextResponse.json({ error: 'Pro plan required' }, { status: 403 }) }
  }
  return { orgId }
}

/** GET /api/locations/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const authResult = await getOrgIdAndEnsurePro(supabase)
  if ('error' in authResult) return authResult.error

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .eq('org_id', authResult.orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

/** PATCH /api/locations/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { data: existing } = await supabase
    .from('locations')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') upd.name = body.name.trim()
  if (typeof body.address === 'string') upd.address = body.address.trim() || null
  if (typeof body.lat === 'number' && !Number.isNaN(body.lat)) upd.lat = body.lat
  if (typeof body.lng === 'number' && !Number.isNaN(body.lng)) upd.lng = body.lng
  if (typeof body.service_radius_km === 'number' && body.service_radius_km >= 0) upd.service_radius_km = body.service_radius_km
  if (body.service_radius_km === null) upd.service_radius_km = null
  if (typeof body.timezone === 'string') upd.timezone = body.timezone.trim() || null
  if (body.service_mode === 'shop' || body.service_mode === 'mobile' || body.service_mode === 'both') upd.service_mode = body.service_mode
  if (typeof body.hours_start === 'number') upd.hours_start = Math.max(0, Math.min(23, body.hours_start))
  if (typeof body.hours_end === 'number') upd.hours_end = Math.max(1, Math.min(24, body.hours_end))
  if (typeof body.slot_interval_minutes === 'number' && body.slot_interval_minutes >= 5) upd.slot_interval_minutes = Math.min(120, body.slot_interval_minutes)
  if (Array.isArray(body.blackout_dates)) upd.blackout_dates = body.blackout_dates
  if (body.blackout_ranges !== undefined) upd.blackout_ranges = body.blackout_ranges
  if (typeof body.sort_order === 'number') upd.sort_order = body.sort_order
  if (typeof body.is_active === 'boolean') upd.is_active = body.is_active
  if (typeof body.booking_promo_code_prefix === 'string') upd.booking_promo_code_prefix = body.booking_promo_code_prefix.trim() || null
  if (body.google_calendar_id === null || body.google_calendar_id === '') upd.google_calendar_id = null
  else if (typeof body.google_calendar_id === 'string' && body.google_calendar_id.trim()) upd.google_calendar_id = body.google_calendar_id.trim()

  const { data, error } = await supabase
    .from('locations')
    .update(upd)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/** DELETE /api/locations/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
