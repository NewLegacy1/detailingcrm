import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { completePendingBooking, type PendingBookingRow } from '@/lib/booking-complete-pending'
import { notifyNewBooking } from '@/lib/notify-new-booking'  // Make sure this import exists

/**
 * Fallback: when the customer lands on the booking success page (after Stripe deposit or card-on-file),
 * the frontend calls this with the Stripe checkout session_id. If the webhook hasn't run yet (or failed),
 * we create the job from the pending_booking here so the booking still appears in the CRM.
 */
export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 501 })
  }

  let body: { session_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : ''
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

  let session: { id: string; metadata?: { pending_booking_id?: string } | null; payment_status?: string; mode?: string }
  try {
    session = (await stripe.checkout.sessions.retrieve(sessionId)) as typeof session
  } catch (err: unknown) {
    const is404 = err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'resource_missing'
    if (is404) {
      const supabase = await createServiceRoleClient()
      const { data: pendingBySession } = await supabase
        .from('pending_bookings')
        .select('id, org_id')
        .eq('stripe_checkout_session_id', sessionId)
        .maybeSingle()
      if (pendingBySession?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('stripe_account_id')
          .eq('id', pendingBySession.org_id)
          .single()
        if (org?.stripe_account_id) {
          try {
            session = (await stripe.checkout.sessions.retrieve(sessionId, {
              stripeAccount: org.stripe_account_id,
            })) as typeof session
          } catch (err2) {
            console.error('Complete session: Stripe retrieve (connected account) failed', err2)
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 })
          }
        } else {
          console.error('Complete session: org has no stripe_account_id')
          return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 })
        }
      } else {
        console.error('Complete session: Stripe retrieve failed (no pending_booking for session)', err)
        return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 })
      }
    } else {
      console.error('Complete session: Stripe retrieve failed', err)
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 })
    }
  }

  const pendingBookingId = session.metadata?.pending_booking_id as string | undefined
  if (!pendingBookingId) {
    return NextResponse.json({ error: 'Not a booking session' }, { status: 400 })
  }

  const isPaid = session.payment_status === 'paid'
  const isSetup = session.mode === 'setup'
  if (!isPaid && !isSetup) {
    return NextResponse.json({ error: 'Session not completed' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: pending, error: fetchErr } = await supabase
    .from('pending_bookings')
    .select('*')
    .eq('id', pendingBookingId)
    .single()

  if (fetchErr || !pending) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (pending.status === 'completed') {
    return NextResponse.json({ success: true })
  }

  if (pending.status !== 'pending') {
    return NextResponse.json({ error: 'Booking no longer pending' }, { status: 400 })
  }

  const result = await completePendingBooking(supabase, pending as PendingBookingRow, session.id)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Card-on-file: persist Stripe Customer ID on the client for on-site checkout
  if (isSetup && result.jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('customer_id')
      .eq('id', result.jobId)
      .single()
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_account_id')
      .eq('id', pending.org_id)
      .single()
    if (job?.customer_id && org?.stripe_account_id) {
      try {
        const sessionWithCustomer = (await stripe.checkout.sessions.retrieve(session.id, {}, {
          stripeAccount: org.stripe_account_id,
        })) as { customer?: string | null }
        const stripeCustomerId = typeof sessionWithCustomer.customer === 'string' ? sessionWithCustomer.customer : sessionWithCustomer.customer ?? null
        if (stripeCustomerId) {
          await supabase
            .from('clients')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', job.customer_id)
        }
      } catch (err) {
        console.error('[complete-session] Failed to persist stripe_customer_id on client', err)
      }
    }
  }

  // ────────────────────────────────────────────────
  // Send confirmation emails/SMS now that job exists
  // ────────────────────────────────────────────────
  const jobId = result.jobId
  if (jobId) {
    try {
      await notifyNewBooking(supabase, jobId)
      console.log('[complete-session] Confirmation emails/SMS sent successfully for job:', jobId)
    } catch (notifyErr) {
      console.error('[complete-session] Failed to send notifications for job', jobId, notifyErr)
      // Non-blocking: booking is complete, don't fail the response
    }
  } else {
    console.warn('[complete-session] No jobId returned from completePendingBooking - skipping notification')
  }

  return NextResponse.json({ success: true, jobId: result.jobId ?? undefined })
}
