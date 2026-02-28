import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { getStripeRedirectBaseUrl } from '@/lib/stripe-redirect-url'

/**
 * POST: Create Stripe Customer Billing Portal session.
 * Returns: { url } to redirect to Stripe portal (manage subscription, update payment method).
 */
export async function POST() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Billing portal is not configured.' }, { status: 501 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing customer found. Subscribe first to manage your plan.' },
      { status: 400 }
    )
  }

  const { baseUrl, error: urlError } = getStripeRedirectBaseUrl()
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400 })
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

    const returnUrl = `${baseUrl}/crm/settings/plan`

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe billing portal error:', err)
    const message = err instanceof Error ? err.message : 'Portal failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
