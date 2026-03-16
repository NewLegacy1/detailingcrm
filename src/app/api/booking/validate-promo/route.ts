import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/booking/validate-promo?slug=xxx&code=YYY&subtotal=100&email=...&phone=...
 * Public: validate a promo code for a booking slug. Optional email/phone check uses_per_customer.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() ?? ''
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase().replace(/\s+/g, '') ?? ''
  const subtotal = parseFloat(req.nextUrl.searchParams.get('subtotal') ?? '0')
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase() || null
  const phone = req.nextUrl.searchParams.get('phone')?.trim() || null

  if (!slug || !code) {
    return NextResponse.json({ valid: false, error: 'slug and code required' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('booking_slug', slug)
    .single()

  if (!org?.id) {
    return NextResponse.json({ valid: false, error: 'Invalid booking link' }, { status: 404 })
  }

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('id, name, code, discount_type, discount_value, usage_limit, used_count, uses_per_customer, is_active')
    .eq('org_id', org.id)
    .ilike('code', code)
    .single()

  if (error || !promo) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired code' })
  }

  if (!promo.is_active) {
    return NextResponse.json({ valid: false, error: 'This code is no longer active' })
  }

  if (promo.usage_limit != null && (promo.used_count ?? 0) >= promo.usage_limit) {
    return NextResponse.json({ valid: false, error: 'This code has reached its usage limit' })
  }

  const usesPerCustomer = promo.uses_per_customer != null ? Number(promo.uses_per_customer) : null
  if (usesPerCustomer != null && usesPerCustomer >= 1 && (email || phone)) {
    let clientId: string | null = null
    if (email) {
      const { data: clientByEmail } = await supabase
        .from('clients')
        .select('id')
        .eq('org_id', org.id)
        .ilike('email', email)
        .limit(1)
        .maybeSingle()
      clientId = clientByEmail?.id ?? null
    }
    if (!clientId && phone) {
      const { data: clientByPhone } = await supabase
        .from('clients')
        .select('id')
        .eq('org_id', org.id)
        .eq('phone', phone)
        .limit(1)
        .maybeSingle()
      clientId = clientByPhone?.id ?? null
    }
    if (clientId) {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code_id', promo.id)
        .eq('customer_id', clientId)
      if ((count ?? 0) >= usesPerCustomer) {
        return NextResponse.json({ valid: false, error: 'You have already used this code the maximum number of times' })
      }
    }
  }

  const sub = Math.max(0, Number.isNaN(subtotal) ? 0 : subtotal)
  let discountAmount = 0
  if (promo.discount_type === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(promo.discount_value)))
    discountAmount = Math.min(sub, (sub * pct) / 100)
  } else {
    discountAmount = Math.min(sub, Number(promo.discount_value) || 0)
  }

  return NextResponse.json({
    valid: true,
    promoCodeId: promo.id,
    name: promo.name,
    discountType: promo.discount_type,
    discountValue: Number(promo.discount_value),
    discountAmount: Math.round(discountAmount * 100) / 100,
  })
}
