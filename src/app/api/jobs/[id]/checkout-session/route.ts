import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

/**
 * POST: Create a Stripe Checkout Session for on-site payment (saved card + tip).
 * Returns { url } to open on device and hand to customer. Requires Pro, Stripe Connect, client with card on file.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 501 })
  }

  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const { id: jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  let tipPercent = 0
  let tipCentsOverride: number | null = null
  try {
    const body = await request.json().catch(() => ({}))
    const pct = typeof body.tipPercent === 'number' ? body.tipPercent : 0
    if (pct >= 0 && pct <= 50) tipPercent = pct
    const custom = typeof body.tipCents === 'number' ? body.tipCents : typeof body.tipAmount === 'number' ? Math.round(body.tipAmount * 100) : null
    if (custom != null && custom >= 0 && custom <= 10000) tipCentsOverride = custom // cap $100
  } catch {
    // no body or invalid
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, org_id, customer_id, base_price, size_price_offset, discount_amount, paid_at')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const alreadyPaid = !!job.paid_at
  if (alreadyPaid) {
    return NextResponse.json({ error: 'Job is already paid' }, { status: 400 })
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, stripe_customer_id')
    .eq('id', job.customer_id)
    .single()

  if (clientError || !client?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Customer has no card on file. They can add a card when booking.' },
      { status: 400 }
    )
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('stripe_account_id, subscription_plan, booking_payment_mode')
    .eq('id', orgId)
    .single()

  if (orgError || !org?.stripe_account_id || org.subscription_plan !== 'pro') {
    return NextResponse.json(
      { error: 'Stripe is not connected or plan does not support on-site checkout' },
      { status: 400 }
    )
  }

  const isCardOnFile = org.booking_payment_mode === 'card_on_file'
  const isDeposit = org.booking_payment_mode === 'deposit'
  if (!isCardOnFile && !isDeposit) {
    return NextResponse.json(
      { error: 'On-site checkout requires card on file or deposit payment mode' },
      { status: 400 }
    )
  }

  const { data: upsells } = await supabase
    .from('job_upsells')
    .select('price')
    .eq('job_id', jobId)

  const { data: existingPayments } = await supabase
    .from('job_payments')
    .select('amount')
    .eq('job_id', jobId)

  const basePrice = Number(job.base_price ?? 0)
  const sizeOffset = Number(job.size_price_offset ?? 0)
  const discount = Number(job.discount_amount ?? 0)
  const upsellTotal = Array.isArray(upsells) ? upsells.reduce((s, u) => s + Number(u.price ?? 0), 0) : 0
  const totalDollars = Math.max(0, basePrice + sizeOffset + upsellTotal - discount)
  const totalCents = Math.round(totalDollars * 100)
  if (totalCents < 50) {
    return NextResponse.json({ error: 'Job total must be at least $0.50' }, { status: 400 })
  }

  const alreadyPaidDollars = Array.isArray(existingPayments)
    ? existingPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
    : 0
  const alreadyPaidCents = Math.round(alreadyPaidDollars * 100)
  const remainderCents = Math.max(0, totalCents - alreadyPaidCents)

  const rawTipCents =
    tipCentsOverride != null ? tipCentsOverride
    : tipPercent > 0 ? Math.round(totalDollars * (tipPercent / 100) * 100) : 0
  const tipCents = Math.min(rawTipCents, 10000) // cap $100

  if (remainderCents < 50 && tipCents < 50) {
    return NextResponse.json(
      { error: alreadyPaidCents >= totalCents ? 'Job is already fully paid.' : 'No remaining balance to collect (minimum charge $0.50).' },
      { status: 400 }
    )
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const crmJobs = `${origin}/crm/jobs`
  const successUrl = `${crmJobs}?paid=1`
  const cancelUrl = crmJobs

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

    const lineItems: { price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }[] = []
    if (remainderCents >= 50) {
      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: alreadyPaidCents > 0 ? 'Balance due' : 'Service total',
            description: alreadyPaidCents > 0 ? `Remaining after $${alreadyPaidDollars.toFixed(2)} already paid` : 'Job payment',
          },
          unit_amount: remainderCents,
        },
        quantity: 1,
      })
    }
    if (tipCents >= 50) {
      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'Tip',
            description: 'Thank you!',
          },
          unit_amount: tipCents,
        },
        quantity: 1,
      })
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'Nothing to charge (balance and tip below minimum).' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: client.stripe_customer_id,
        payment_method_types: ['card'],
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { job_id: jobId },
      },
      { stripeAccount: org.stripe_account_id }
    )

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Job checkout session error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment session failed' },
      { status: 500 }
    )
  }
}
