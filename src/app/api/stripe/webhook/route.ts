import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
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

    // Booking deposit flow (Pro): metadata.pending_booking_id
    const pendingBookingId = session.metadata?.pending_booking_id as string | undefined
    if (pendingBookingId && session.payment_status === 'paid') {
      const supabase = await createServiceRoleClient()
      const { data: pending, error: fetchErr } = await supabase
        .from('pending_bookings')
        .select('*')
        .eq('id', pendingBookingId)
        .eq('status', 'pending')
        .single()

      if (!fetchErr && pending) {
        const orgId = pending.org_id
        const customer = (pending.customer as { name?: string; email?: string; phone?: string }) || {}
        const vehicleInput = (pending.vehicle as { make?: string; model?: string; year?: number; color?: string }) || {}
        const name = String(customer.name ?? '').trim()
        const email = customer.email ? String(customer.email).trim() : null
        const phone = customer.phone ? String(customer.phone).trim() : null

        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            name: name || 'Booking Customer',
            email: email || null,
            phone: phone || null,
            address: pending.address || null,
            org_id: orgId,
          })
          .select('id')
          .single()

        if (clientError || !newClient?.id) {
          console.error('Webhook booking: client insert', clientError)
          return NextResponse.json({ received: true })
        }

        let vehicleId: string | null = null
        const make = String(vehicleInput.make ?? '').trim()
        const model = String(vehicleInput.model ?? '').trim()
        if (make || model) {
          const year = vehicleInput.year && Number.isInteger(vehicleInput.year) ? vehicleInput.year : null
          const color = vehicleInput.color ? String(vehicleInput.color).trim() || null : null
          const { data: newVehicle } = await supabase
            .from('vehicles')
            .insert({
              customer_id: newClient.id,
              make: make || 'Unknown',
              model: model || 'Unknown',
              year,
              color,
            })
            .select('id')
            .single()
          if (newVehicle?.id) vehicleId = newVehicle.id
        }

        const jobNotes = [pending.notes, pending.size_key ? `Vehicle size: ${pending.size_key}` : null].filter(Boolean).join('\n') || null

        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            customer_id: newClient.id,
            vehicle_id: vehicleId,
            service_id: pending.service_id,
            scheduled_at: pending.scheduled_at,
            address: pending.address,
            status: 'scheduled',
            org_id: orgId,
            notes: jobNotes,
            base_price: Number(pending.base_price),
            size_price_offset: Number(pending.size_price_offset),
          })
          .select('id')
          .single()

        if (!jobError && newJob?.id) {
          const upsells = (pending.upsells as { id?: string; name: string; price: number }[]) || []
          if (upsells.length > 0) {
            await supabase.from('job_upsells').insert(
              upsells.map((u: { id?: string; name: string; price: number }) => ({
                job_id: newJob.id,
                upsell_id: u.id || null,
                name: u.name,
                price: Number(u.price) || 0,
              }))
            )
          }
          const depositAmount = (pending.deposit_amount_cents ?? 0) / 100
          await supabase.from('job_payments').insert({
            job_id: newJob.id,
            amount: depositAmount,
            method: 'stripe',
            reference: session.id,
          })
          try {
            const { data: defaultItems } = await supabase
              .from('organization_default_checklist')
              .select('label, sort_order')
              .eq('org_id', orgId)
              .order('sort_order')
            if (defaultItems?.length) {
              await supabase.from('job_checklist_items').insert(
                defaultItems.map((item: { label: string; sort_order: number }) => ({
                  job_id: newJob.id,
                  label: item.label,
                  sort_order: item.sort_order,
                  checked: false,
                }))
              )
            }
          } catch (_) {}
          const { syncJobToGoogle } = await import('@/lib/google-calendar-sync')
          try {
            await syncJobToGoogle(supabase, orgId, newJob.id)
          } catch (_) {}
        }

        await supabase
          .from('pending_bookings')
          .update({ status: 'completed', stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
          .eq('id', pendingBookingId)
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
