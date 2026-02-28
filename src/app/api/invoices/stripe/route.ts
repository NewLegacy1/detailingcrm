import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const startingAfter = searchParams.get('starting_after') || undefined

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

    // Fetch invoices from Stripe
    const stripeInvoices = await stripe.invoices.list({
      limit: Math.min(limit, 100),
      starting_after: startingAfter,
      expand: ['data.customer', 'data.payment_intent'],
    })

    // Format invoices for display
    const invoices = stripeInvoices.data.map((invoice) => {
      const customer = invoice.customer
      const customerId = typeof customer === 'string' ? customer : customer?.id || 'unknown'
      const customerName = typeof customer === 'object' && customer && 'name' in customer
        ? (customer.name || (customer.email || 'Unknown'))
        : typeof customer === 'object' && customer && 'email' in customer
        ? customer.email || 'Unknown'
        : 'Unknown'
      const customerEmail = typeof customer === 'object' && customer && 'email' in customer
        ? customer.email || null
        : null

      return {
        id: invoice.id,
        number: invoice.number,
        customerId,
        customerName,
        customerEmail,
        amount: invoice.amount_due || invoice.amount_paid || 0,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        paid: invoice.status === 'paid',
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        created: invoice.created * 1000, // Convert to milliseconds
        dueDate: invoice.due_date ? invoice.due_date * 1000 : null,
        paidAt: invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : null,
        description: invoice.description || null,
        lineItems: invoice.lines.data.map((line) => ({
          description: line.description || 'No description',
          quantity: line.quantity || 1,
          amount: line.amount || 0,
          currency: line.currency.toUpperCase(),
        })),
      }
    })

    return NextResponse.json({
      invoices,
      hasMore: stripeInvoices.has_more,
      nextStartingAfter: stripeInvoices.data.length > 0 
        ? stripeInvoices.data[stripeInvoices.data.length - 1].id 
        : null,
    })
  } catch (error: any) {
    console.error('Error fetching Stripe invoices:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices from Stripe' },
      { status: 500 }
    )
  }
}
