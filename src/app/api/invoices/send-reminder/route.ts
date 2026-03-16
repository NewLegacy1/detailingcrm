import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

/**
 * POST: Send an invoice reminder (re-send the invoice email via Stripe).
 * Body: { stripe_invoice_id: string }
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const role = profile?.role
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .single()

  if (!org?.stripe_account_id) {
    return NextResponse.json({ error: 'Stripe not connected for this organization' }, { status: 400 })
  }

  let body: { stripe_invoice_id?: string }
  try {
    body = await request.json().catch(() => ({}))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const stripeInvoiceId = typeof body.stripe_invoice_id === 'string' ? body.stripe_invoice_id.trim() : null
  if (!stripeInvoiceId) {
    return NextResponse.json({ error: 'stripe_invoice_id is required' }, { status: 400 })
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
    const opts = { stripeAccount: org.stripe_account_id }

    const invoice = await stripe.invoices.retrieve(stripeInvoiceId, opts)
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Invoice is still a draft. Finalize and send it first from the invoice form.' },
        { status: 400 }
      )
    }
    if (invoice.status === 'paid' || invoice.status === 'void' || invoice.status === 'uncollectible') {
      return NextResponse.json(
        { error: 'Cannot send reminder for this invoice status.' },
        { status: 400 }
      )
    }

    await stripe.invoices.sendInvoice(stripeInvoiceId, opts)
    return NextResponse.json({ ok: true, message: 'Reminder sent.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send reminder'
    console.error('Send invoice reminder error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
