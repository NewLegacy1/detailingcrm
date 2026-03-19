import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { haversineDistanceKm } from '@/lib/utils'
import { formatScheduledAtForCustomer } from '@/lib/format-scheduled-at-display'

/** Public: create Stripe Checkout Session for booking deposit (Pro + booking_payment_mode = deposit). Redirect customer to pay deposit. */
export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 501 })
  }

  let body: {
    slug?: string
    locationId?: string
    serviceId?: string
    scheduledAt?: string
    address?: string
    addressLat?: number
    addressLng?: number
    serviceLocation?: 'mobile' | 'shop'
    notes?: string
    sizeKey?: string
    basePrice?: number
    sizePriceOffset?: number
    upsells?: { id?: string; name: string; price: number }[]
    customer?: { name?: string; email?: string; phone?: string }
    vehicle?: { make?: string; model?: string; year?: number; color?: string }
    discountAmount?: number
    promoCodeId?: string
    sessionToken?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const locationId = typeof body.locationId === 'string' ? body.locationId.trim() || null : null
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken.trim() : ''
  const successTokenParam = sessionToken ? `&session_token=${encodeURIComponent(sessionToken)}` : ''
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId.trim() : ''
  const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt.trim() : ''
  const serviceLocation = body.serviceLocation === 'shop' ? 'shop' : 'mobile'
  let address = typeof body.address === 'string' ? body.address.trim() : ''
  let addressLat = typeof body.addressLat === 'number' && !Number.isNaN(body.addressLat) ? body.addressLat : null
  let addressLng = typeof body.addressLng === 'number' && !Number.isNaN(body.addressLng) ? body.addressLng : null
  const notesRaw = typeof body.notes === 'string' ? body.notes.trim() : ''
  const sizeKey = typeof body.sizeKey === 'string' ? body.sizeKey.trim() : null
  const basePrice = typeof body.basePrice === 'number' ? body.basePrice : 0
  const sizePriceOffset = typeof body.sizePriceOffset === 'number' ? body.sizePriceOffset : 0
  const upsellsInput = Array.isArray(body.upsells) ? body.upsells : []
  const discountAmount = typeof body.discountAmount === 'number' && body.discountAmount >= 0 ? body.discountAmount : 0
  const promoCodeId = typeof body.promoCodeId === 'string' ? body.promoCodeId.trim() || null : null
  const customer = body.customer && typeof body.customer === 'object' ? body.customer : {}
  const vehicleInput = body.vehicle && typeof body.vehicle === 'object' ? body.vehicle : {}

  if (!slug || !serviceId || !scheduledAt || !address) {
    return NextResponse.json({ error: 'slug, serviceId, scheduledAt, address required' }, { status: 400 })
  }
  const name = typeof customer.name === 'string' ? customer.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'customer.name required' }, { status: 400 })

  const scheduledDate = new Date(scheduledAt)
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invalid or past scheduledAt' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, map_lat, map_lng, service_radius_km, shop_address, stripe_account_id, booking_payment_mode, subscription_plan, timezone')
    .eq('booking_slug', slug)
    .single()

  if (orgError || !org?.id) {
    return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 })
  }

  let resolvedLocationId: string | null = null
  if (locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id, address')
      .eq('id', locationId)
      .eq('org_id', org.id)
      .eq('is_active', true)
      .single()
    if (loc?.id) resolvedLocationId = loc.id
  }

  if (serviceLocation === 'shop') {
    if (resolvedLocationId) {
      const { data: loc } = await supabase.from('locations').select('address').eq('id', resolvedLocationId).single()
      if (loc?.address) address = String(loc.address).trim()
    }
    if (!address) address = typeof org.shop_address === 'string' ? org.shop_address.trim() : ''
    if (!address) {
      return NextResponse.json({ error: 'Shop address is not set. Please contact the business.' }, { status: 400 })
    }
    addressLat = null
    addressLng = null
  }

  const radiusKm = org.service_radius_km != null ? Number(org.service_radius_km) : null
  if (serviceLocation === 'mobile' && radiusKm != null && radiusKm > 0) {
    const centerLat = org.map_lat != null ? Number(org.map_lat) : null
    const centerLng = org.map_lng != null ? Number(org.map_lng) : null
    if (centerLat != null && centerLng != null) {
      if (addressLat == null || addressLng == null) {
        return NextResponse.json(
          { error: 'Please select your address from the suggestions so we can confirm it\'s in our service area.' },
          { status: 400 }
        )
      }
      const dist = haversineDistanceKm(centerLat, centerLng, addressLat, addressLng)
      if (dist > radiusKm) {
        return NextResponse.json(
          { error: 'This address is outside our service area.' },
          { status: 400 }
        )
      }
    }
  }

  if (org.subscription_plan !== 'pro') {
    return NextResponse.json({ error: 'Checkout not available' }, { status: 400 })
  }
  const isCardOnFile = org.booking_payment_mode === 'card_on_file'
  const isDeposit = org.booking_payment_mode === 'deposit'
  if (!isCardOnFile && !isDeposit) {
    return NextResponse.json({ error: 'Checkout not enabled' }, { status: 400 })
  }
  if (!org.stripe_account_id) {
    return NextResponse.json({ error: 'Business has not connected Stripe. Please book without payment or contact the business.' }, { status: 400 })
  }

  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('id, name')
    .eq('id', serviceId)
    .eq('org_id', org.id)
    .single()

  if (svcError || !service?.id) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  if (promoCodeId) {
    const emailNorm = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() || null : null
    const phoneNorm = typeof customer.phone === 'string' ? customer.phone.trim() || null : null
    const { data: promoRow } = await supabase
      .from('promo_codes')
      .select('uses_per_customer')
      .eq('id', promoCodeId)
      .single()
    const usesPerCustomer = promoRow?.uses_per_customer != null ? Number(promoRow.uses_per_customer) : null
    if (usesPerCustomer != null && usesPerCustomer >= 1 && (emailNorm || phoneNorm)) {
      let existingClientId: string | null = null
      if (emailNorm) {
        const { data: c } = await supabase.from('clients').select('id').eq('org_id', org.id).ilike('email', emailNorm).limit(1).maybeSingle()
        existingClientId = c?.id ?? null
      }
      if (!existingClientId && phoneNorm) {
        const { data: c } = await supabase.from('clients').select('id').eq('org_id', org.id).eq('phone', phoneNorm).limit(1).maybeSingle()
        existingClientId = c?.id ?? null
      }
      if (existingClientId) {
        const { count } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('promo_code_id', promoCodeId)
          .eq('customer_id', existingClientId)
        if ((count ?? 0) >= usesPerCustomer) {
          return NextResponse.json(
            { error: 'You have already used this promo code the maximum number of times.' },
            { status: 400 }
          )
        }
      }
    }
  }

  if (isDeposit) {
  const totalCents = Math.round((basePrice + sizePriceOffset + upsellsInput.reduce((s, u) => s + Number(u.price || 0), 0) - discountAmount) * 100)
  const depositCents = Math.max(100, Math.round(Math.max(0, totalCents) * 0.5))

  const { data: pending, error: pendingError } = await supabase
    .from('pending_bookings')
    .insert({
      org_id: org.id,
      slug,
      service_id: serviceId,
      scheduled_at: scheduledDate.toISOString(),
      address,
      customer: { name, email: customer.email ?? null, phone: customer.phone ?? null },
      vehicle: vehicleInput,
      size_key: sizeKey,
      base_price: basePrice,
      size_price_offset: sizePriceOffset,
      upsells: upsellsInput,
      notes: notesRaw || null,
      status: 'pending',
      deposit_amount_cents: depositCents,
      discount_amount: discountAmount,
      promo_code_id: promoCodeId,
      location_id: resolvedLocationId,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (pendingError || !pending?.id) {
    console.error('Pending booking insert:', pendingError)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Deposit: ${service.name}`,
              description: `Booking deposit (${formatScheduledAtForCustomer(scheduledDate.toISOString(), org.timezone as string | null | undefined, { dateStyle: 'medium', timeStyle: 'short' })})`,
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/book/${encodeURIComponent(slug)}?deposit_success=1&session_id={CHECKOUT_SESSION_ID}${successTokenParam}`,
      cancel_url: `${origin}/book/${encodeURIComponent(slug)}?deposit_cancelled=1`,
      metadata: { pending_booking_id: pending.id },
      payment_intent_data: {
        transfer_data: {
          destination: org.stripe_account_id,
        },
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
    }

    await supabase
      .from('pending_bookings')
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', pending.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Payment session failed' }, { status: 500 })
  }
  }

  // Card-on-file: create pending booking and Stripe Checkout in setup mode (save card on connected account)
  const { data: pending, error: pendingError } = await supabase
    .from('pending_bookings')
    .insert({
      org_id: org.id,
      slug,
      service_id: serviceId,
      scheduled_at: scheduledDate.toISOString(),
      address,
      customer: { name, email: customer.email ?? null, phone: customer.phone ?? null },
      vehicle: vehicleInput,
      size_key: sizeKey,
      base_price: basePrice,
      size_price_offset: sizePriceOffset,
      upsells: upsellsInput,
      notes: notesRaw || null,
      status: 'pending',
      deposit_amount_cents: 0,
      discount_amount: discountAmount,
      promo_code_id: promoCodeId,
      location_id: resolvedLocationId,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (pendingError || !pending?.id) {
    console.error('Pending booking insert (card-on-file):', pendingError)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'setup',
        payment_method_types: ['card'],
        success_url: `${origin}/book/${encodeURIComponent(slug)}?card_saved=1&session_id={CHECKOUT_SESSION_ID}${successTokenParam}`,
        cancel_url: `${origin}/book/${encodeURIComponent(slug)}?card_cancelled=1`,
        metadata: { pending_booking_id: pending.id },
      },
      { stripeAccount: org.stripe_account_id }
    )

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    await supabase
      .from('pending_bookings')
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', pending.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session (card-on-file) error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Checkout session failed' }, { status: 500 })
  }
}
