import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

/** GET /api/locations/[id]/services - list services offered at this location. Pro only. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await params
  const result = await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  if ('error' in result) return result.error
  const orgId = result.auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const supabase = await createClient()
  const { data: org } = await supabase.from('organizations').select('subscription_plan').eq('id', orgId).single()
  if (org?.subscription_plan !== 'pro') return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })

  const { data: location } = await supabase.from('locations').select('id').eq('id', locationId).eq('org_id', orgId).single()
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  const { data: list } = await supabase.from('location_services').select('service_id, is_offered, price_override').eq('location_id', locationId)
  const { data: allServices } = await supabase.from('services').select('id, name, base_price').eq('org_id', orgId).order('name')

  const byService = new Map((list ?? []).map((r: { service_id: string; is_offered: boolean; price_override: number | null }) => [r.service_id, r]))
  const items = (allServices ?? []).map((s: { id: string; name: string; base_price: number }) => {
    const row = byService.get(s.id)
    return { service_id: s.id, name: s.name, base_price: s.base_price, is_offered: row ? row.is_offered : false, price_override: row?.price_override ?? null }
  })
  return NextResponse.json(items)
}

/** PATCH /api/locations/[id]/services - set services offered and price overrides. Body: { services: { service_id, is_offered, price_override? }[] } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await params
  const result = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
  if ('error' in result) return result.error
  const orgId = result.auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const supabase = await createClient()
  const { data: org } = await supabase.from('organizations').select('subscription_plan').eq('id', orgId).single()
  if (org?.subscription_plan !== 'pro') return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })

  const { data: location } = await supabase.from('locations').select('id').eq('id', locationId).eq('org_id', orgId).single()
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  let body: { services?: Array<{ service_id: string; is_offered: boolean; price_override?: number | null }> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const services = Array.isArray(body.services) ? body.services : []

  for (const item of services) {
    const serviceId = typeof item.service_id === 'string' ? item.service_id.trim() : ''
    if (!serviceId) continue
    const priceOverride = typeof item.price_override === 'number' && !Number.isNaN(item.price_override) ? item.price_override : null
    const { error: upsertErr } = await supabase.from('location_services').upsert(
      { location_id: locationId, service_id: serviceId, is_offered: item.is_offered === true, price_override: priceOverride, updated_at: new Date().toISOString() },
      { onConflict: 'location_id,service_id' }
    )
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
