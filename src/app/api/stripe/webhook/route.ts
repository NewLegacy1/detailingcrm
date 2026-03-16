import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { completePendingBooking, type PendingBookingRow } from '@/lib/booking-complete-pending'
import { sendReviewRequestForJob } from '@/lib/send-review-request'
import type Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export async function POST(request: Request) {
  if (!webhookSecret || !stripeSecretKey) {
    console.error('Stripe webhook: missing STRIPE_SUBSCRIPTION_WEBHOOK_SECRET or STRIPE_SECRET_KEY')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 501 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Stripe webhook signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Booking deposit or card-on-file flow (Pro): metadata.pending_booking_id
    const pendingBookingId = session.metadata?.pending_booking_id as string | undefined
    const isPaidDeposit = pendingBookingId && session.payment_status === 'paid'
    const isSetupComplete = pendingBookingId && session.mode === 'setup'
    if (pendingBookingId && (isPaidDeposit || isSetupComplete)) {
      const supabase = await createServiceRoleClient()
      const { data: pending, error: fetchErr } = await supabase
        .from('pending_bookings')
        .select('*')
        .eq('id', pendingBookingId)
        .eq('status', 'pending')
        .single()

      if (!fetchErr && pending) {
        const result = await completePendingBooking(supabase, pending as PendingBookingRow, session.id)
        // Card-on-file: persist Stripe Customer ID on the client for on-site checkout
        if (isSetupComplete && result.jobId) {
          const { data: job } = await supabase
            .from('jobs')
            .select('customer_id')
            .eq('id', result.jobId)
            .single()
          const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
          if (job?.customer_id && stripeCustomerId) {
            await supabase
              .from('clients')
              .update({ stripe_customer_id: stripeCustomerId })
              .eq('id', job.customer_id)
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    // On-site job payment (Collect payment with saved card): metadata.job_id
    const jobIdFromSession = session.metadata?.job_id as string | undefined
    if (jobIdFromSession && session.payment_status === 'paid' && session.mode === 'payment') {
      const supabase = await createServiceRoleClient()
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .select('id, org_id')
        .eq('id', jobIdFromSession)
        .single()
      if (!jobErr && job?.org_id) {
        const amountTotal = typeof session.amount_total === 'number' ? session.amount_total / 100 : 0
        await supabase.from('job_payments').insert({
          job_id: job.id,
          amount: amountTotal,
          method: 'stripe',
          reference: session.id,
        })
        const now = new Date().toISOString()
        await supabase
          .from('jobs')
          .update({ paid_at: now, status: 'done', updated_at: now })
          .eq('id', job.id)
        try {
          await sendReviewRequestForJob(supabase, job.id)
        } catch (e) {
          console.error('[webhook] send review after job paid:', e)
        }
      }
      return NextResponse.json({ received: true })
    }

    // Subscription flow (paywall)
    if (session.mode !== 'subscription' || !session.subscription) {
      return NextResponse.json({ received: true })
    }

    const userId =
      (session.metadata?.userId as string) || (session.client_reference_id as string) || null
    if (!userId) {
      console.error('Stripe webhook: checkout.session.completed missing userId in metadata/client_reference_id')
      return NextResponse.json({ received: true })
    }

    const plan =
      (session.metadata?.plan as string)?.toLowerCase() === 'pro'
        ? 'pro'
        : 'starter'
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null

    const supabase = await createServiceRoleClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single()

    if (!profile?.org_id) {
      console.error('Stripe webhook: no profile or org_id for user', userId)
      return NextResponse.json({ received: true })
    }

    const { error } = await supabase
      .from('organizations')
      .update({
        subscription_plan: plan,
        subscription_status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      })
      .eq('id', profile.org_id)

    if (error) {
      console.error('Stripe webhook: failed to update organization', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
