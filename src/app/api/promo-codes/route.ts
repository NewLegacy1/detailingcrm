import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

/** GET: list promo codes for the org */
export async function GET() {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAuthClient()
  const locationId = auth.locationId ?? null
  let query = supabase
    .from('promo_codes')
    .select('id, name, code, discount_type, discount_value, usage_limit, uses_per_customer, used_count, total_discount_amount, valid_from, valid_until, is_active, created_at, location_id')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
  if (locationId) {
    query = query.eq('location_id', locationId)
  }
  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

/** POST: create promo code */
export async function POST(req: NextRequest) {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: string; code?: string; discount_type?: string; discount_value?: number; usage_limit?: number | null | string; uses_per_customer?: number | null | string; location_id?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const locationId = auth.locationId ?? null
  const createLocationId = (typeof body.location_id === 'string' && body.location_id.trim())
    ? body.location_id.trim()
    : null
  if (locationId && createLocationId && createLocationId !== locationId) {
    return NextResponse.json({ error: 'You can only create promo codes for your location' }, { status: 403 })
  }
  const effectiveLocationId = locationId || createLocationId || null
  if (locationId) {
    if (!effectiveLocationId || effectiveLocationId !== locationId) {
      return NextResponse.json({ error: 'Location managers must create promo codes for their assigned location' }, { status: 400 })
    }
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase().replace(/\s+/g, '') : ''
  const discountType = body.discount_type === 'fixed' ? 'fixed' : 'percent'
  const discountValue = typeof body.discount_value === 'number' && body.discount_value >= 0 ? body.discount_value : 0
  const usageLimit = body.usage_limit != null && body.usage_limit !== '' ? (typeof body.usage_limit === 'number' ? body.usage_limit : parseInt(String(body.usage_limit), 10)) : null
  const usesPerCustomer = body.uses_per_customer != null && body.uses_per_customer !== '' ? (typeof body.uses_per_customer === 'number' ? body.uses_per_customer : parseInt(String(body.uses_per_customer), 10)) : null

  if (!name || !code) {
    return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
  }
  if (discountType === 'percent' && (discountValue < 0 || discountValue > 100)) {
    return NextResponse.json({ error: 'Percent discount must be 0–100' }, { status: 400 })
  }
  if (usageLimit != null && (Number.isNaN(usageLimit) || usageLimit < 1)) {
    return NextResponse.json({ error: 'Usage limit must be a positive number or empty' }, { status: 400 })
  }
  if (usesPerCustomer != null && (Number.isNaN(usesPerCustomer) || usesPerCustomer < 1)) {
    return NextResponse.json({ error: 'Uses per customer must be 1 or more, or empty' }, { status: 400 })
  }

  const supabase = await createAuthClient()
  if (effectiveLocationId && auth.orgId) {
    const { data: loc } = await supabase.from('locations').select('id').eq('id', effectiveLocationId).eq('org_id', auth.orgId).eq('is_active', true).single()
    if (!loc) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
    }
  }
  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      org_id: auth.orgId,
      location_id: effectiveLocationId,
      name,
      code,
      discount_type: discountType,
      discount_value: discountValue,
      usage_limit: usageLimit,
      uses_per_customer: usesPerCustomer,
    })
    .select('id, name, code, discount_type, discount_value, usage_limit, uses_per_customer, used_count, total_discount_amount, valid_from, valid_until, is_active, created_at, location_id')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A promo code with this code already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
