import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { allowProFeatures } from '@/lib/pro-features'

/** GET /api/locations — list locations for current org. Pro only. */
export async function GET() {
  const result = await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  if ('error' in result) return result.error
  const { auth } = result
  const orgId = auth.orgId
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

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/** POST /api/locations — create location. Pro only. */
export async function POST(req: NextRequest) {
  const result = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
  if ('error' in result) return result.error
  const { auth } = result
  const orgId = auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan, timezone')
    .eq('id', orgId)
    .single()
  if (!allowProFeatures(org?.subscription_plan)) {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const insert: Record<string, unknown> = {
    org_id: orgId,
    name,
    address: typeof body.address === 'string' ? body.address.trim() || null : null,
    lat: typeof body.lat === 'number' && !Number.isNaN(body.lat) ? body.lat : null,
    lng: typeof body.lng === 'number' && !Number.isNaN(body.lng) ? body.lng : null,
    service_radius_km: typeof body.service_radius_km === 'number' && body.service_radius_km >= 0 ? body.service_radius_km : null,
    timezone: typeof body.timezone === 'string' ? body.timezone.trim() || null : null,
    service_mode: body.service_mode === 'shop' || body.service_mode === 'mobile' ? body.service_mode : 'both',
    hours_start: typeof body.hours_start === 'number' ? Math.max(0, Math.min(23, body.hours_start)) : 9,
    hours_end: typeof body.hours_end === 'number' ? Math.max(1, Math.min(24, body.hours_end)) : 18,
    slot_interval_minutes: typeof body.slot_interval_minutes === 'number' && body.slot_interval_minutes >= 5
      ? Math.min(120, body.slot_interval_minutes)
      : 30,
    blackout_dates: Array.isArray(body.blackout_dates) ? body.blackout_dates : [],
    blackout_ranges: body.blackout_ranges != null && typeof body.blackout_ranges === 'object' ? body.blackout_ranges : null,
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    is_active: body.is_active !== false,
    booking_promo_code_prefix: typeof body.booking_promo_code_prefix === 'string' ? body.booking_promo_code_prefix.trim() || null : null,
  }

  const { data, error } = await supabase
    .from('locations')
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
