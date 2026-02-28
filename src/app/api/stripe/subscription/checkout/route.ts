import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { getStripeRedirectBaseUrl } from '@/lib/stripe-redirect-url'

/**
 * POST: Create Stripe Checkout Session for subscription (paywall).
 * Body: { plan: 'starter' | 'pro' }
 * Returns: { url } to redirect to Stripe Checkout.
 */
export async function POST(request: Request) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const priceIdStarter = process.env.STRIPE_PRICE_ID_STARTER ?? process.env.STARTER_PRICE_ID
  const priceIdPro = process.env.STRIPE_PRICE_ID_PRO ?? process.env.PRO_PRICE_ID

  if (!stripeSecretKey || !priceIdStarter) {
    return NextResponse.json(
      { error: 'Subscription checkout is not configured.' },
      { status: 501 }
    )
  }

  let body: { plan?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const plan = (body.plan ?? 'starter').toLowerCase()
  const priceId = plan === 'pro' && priceIdPro ? priceIdPro : priceIdStarter

  const { baseUrl, error: urlError } = getStripeRedirectBaseUrl()
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400 })
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/onboarding/setup?plan=${plan}`,
      cancel_url: `${baseUrl}/onboarding`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { plan, userId: user.id },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
