import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** Public: create Stripe Checkout Session for booking deposit (Pro + booking_payment_mode = deposit). Redirect customer to pay deposit. */
export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 501 })
  }

  let body: {
    slug?: string
    serviceId?: string
    scheduledAt?: string
    address?: string
    notes?: string
    sizeKey?: string
    basePrice?: number
    sizePriceOffset?: number
    upsells?: { id?: string; name: string; price: number }[]
    customer?: { name?: string; email?: string; phone?: string }
    vehicle?: { make?: string; model?: string; year?: number; color?: string }
    discountAmount?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const serviceId = typeof body.serviceId === 'string' ? body.serviceId.trim() : ''
  const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const notesRaw = typeof body.notes === 'string' ? body.notes.trim() : ''
  const sizeKey = typeof body.sizeKey === 'string' ? body.sizeKey.trim() : null
  const basePrice = typeof body.basePrice === 'number' ? body.basePrice : 0
  const sizePriceOffset = typeof body.sizePriceOffset === 'number' ? body.sizePriceOffset : 0
  const upsellsInput = Array.isArray(body.upsells) ? body.upsells : []
  const discountAmount = typeof body.discountAmount === 'number' && body.discountAmount >= 0 ? body.discountAmount : 0
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
    .select('id, stripe_account_id, booking_payment_mode, subscription_plan')
    .eq('booking_slug', slug)
    .single()

  if (orgError || !org?.id) {
    return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 })
  }

  if (org.subscription_plan !== 'pro' || org.booking_payment_mode !== 'deposit') {
    return NextResponse.json({ error: 'Deposit checkout not enabled' }, { status: 400 })
  }
  if (!org.stripe_account_id) {
    return NextResponse.json({ error: 'Business has not connected Stripe. Please book without deposit or contact the business.' }, { status: 400 })
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
              description: `Booking deposit (${new Date(scheduledAt).toLocaleString()})`,
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/book/${encodeURIComponent(slug)}?deposit_success=1&session_id={CHECKOUT_SESSION_ID}`,
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
