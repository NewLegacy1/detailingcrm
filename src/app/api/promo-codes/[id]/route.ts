import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

async function getParamsId(params: Promise<{ id: string }>) {
  const p = await params
  return p.id
}

/** GET: single promo (for edit) */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = await getParamsId(context.params)
  const supabase = await createAuthClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id, name, code, discount_type, discount_value, usage_limit, uses_per_customer, used_count, total_discount_amount, valid_from, valid_until, is_active, created_at')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

/** PATCH: update promo */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = await getParamsId(context.params)
  let body: { name?: string; code?: string; discount_type?: string; discount_value?: number; usage_limit?: number | null | string; uses_per_customer?: number | null | string; is_active?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createAuthClient()
  const { data: existing } = await supabase
    .from('promo_codes')
    .select('id')
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (typeof body.code === 'string') updates.code = body.code.trim().toUpperCase().replace(/\s+/g, '')
  if (body.discount_type === 'fixed' || body.discount_type === 'percent') updates.discount_type = body.discount_type
  if (typeof body.discount_value === 'number' && body.discount_value >= 0) updates.discount_value = body.discount_value
  if (body.usage_limit !== undefined) updates.usage_limit = body.usage_limit == null || body.usage_limit === '' ? null : typeof body.usage_limit === 'number' ? body.usage_limit : Number(body.usage_limit)
  if (body.uses_per_customer !== undefined) updates.uses_per_customer = body.uses_per_customer == null || body.uses_per_customer === '' ? null : typeof body.uses_per_customer === 'number' ? body.uses_per_customer : Number(body.uses_per_customer)
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  const { data, error } = await supabase
    .from('promo_codes')
    .update(updates)
    .eq('id', id)
    .eq('org_id', auth.orgId)
    .select('id, name, code, discount_type, discount_value, usage_limit, uses_per_customer, used_count, total_discount_amount, valid_from, valid_until, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A promo code with this code already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

/** DELETE: remove promo */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = await getParamsId(context.params)
  const supabase = await createAuthClient()
  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .eq('id', id)
    .eq('org_id', auth.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
