import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export async function POST(request: NextRequest) {
  try {
    const result = await requirePermission(PERMISSIONS.INVOICES_SEND)
    if ('error' in result) return result.error
    const { auth } = result

    const supabase = await createClient()
    let orgId = auth.orgId
    if (!orgId) {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
      orgId = org?.id ?? null
    }
    let stripeAccountId: string | null = null
    if (orgId) {
      const res = await supabase
        .from('organizations')
        .select('stripe_account_id')
        .eq('id', orgId)
        .single()
      stripeAccountId = res.data?.stripe_account_id ?? null
    }

    const body = await request.json()
    const { clientId, jobId, currency = 'usd', dueDate, memo, footer, lineItems } = body

    if (!clientId || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'clientId and at least one lineItem are required' },
        { status: 400 }
      )
    }
    
    // Separate one-time and recurring items
    const oneTimeItems = lineItems.filter((item: { isMonthly?: boolean }) => !item.isMonthly)
    const recurringItems = lineItems.filter((item: { isMonthly?: boolean }) => item.isMonthly)

    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', clientId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const amountTotal = lineItems.reduce(
      (sum: number, row: { quantity?: number; unit_amount?: number }) =>
        sum + (Number(row.quantity) || 0) * (Number(row.unit_amount) || 0),
      0
    )

    const invoiceRecord = {
      client_id: clientId,
      job_id: jobId || null,
      created_by: auth.userId,
      stripe_invoice_id: null as string | null,
      stripe_customer_id: null as string | null,
      status: stripeSecretKey ? 'pending' : 'draft',
      currency: currency.toLowerCase(),
      amount_total: amountTotal,
      amount_due: amountTotal,
      due_date: dueDate || null,
      line_items: lineItems.map((row: { description: string; quantity: number; unit_amount: number; amount: number }) => ({
        description: row.description,
        quantity: row.quantity,
        unit_amount: row.unit_amount,
        amount: row.amount ?? row.quantity * row.unit_amount,
      })),
      memo: memo || null,
      footer: footer || null,
    }

    // When STRIPE_SECRET_KEY is set and stripe package is installed:
    // 1. Create or retrieve Stripe customer (name, email from client)
    // 2. stripe.invoices.create({ customer, collection_method: 'send_invoice', days_until_due })
    // 3. stripe.invoiceItems.create for each line (description, quantity, unit_amount, currency)
    // 4. stripe.invoices.finalizeInvoice + sendInvoice
    // 5. Set invoiceRecord.stripe_invoice_id, stripe_customer_id, status = 'sent', sent_at = now
    if (stripeSecretKey) {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
        const stripeOpts = stripeAccountId ? { stripeAccount: stripeAccountId } : {}
        const stripeCustomer = await stripe.customers.create(
          {
            name: client.name,
            email: client.email ?? undefined,
          },
          stripeOpts
        )
        invoiceRecord.stripe_customer_id = stripeCustomer.id

        const stripeInvoice = await stripe.invoices.create(
          {
            customer: stripeCustomer.id,
            collection_method: 'send_invoice',
            days_until_due: dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30,
            ...(memo && { description: memo }),
            ...(footer && { footer }),
            metadata: { crm_client_id: clientId },
          },
          stripeOpts
        )

        // Add one-time invoice items
        for (const row of oneTimeItems) {
          await stripe.invoiceItems.create(
            {
              customer: stripeCustomer.id,
              invoice: stripeInvoice.id,
              description: row.description,
              quantity: row.quantity,
              unit_amount_decimal: String(Math.round((row.unit_amount ?? 0) * 100)),
              currency: currency.toLowerCase(),
            },
            stripeOpts
          )
        }

        // Create subscriptions for recurring items
        for (const row of recurringItems) {
          const price = await stripe.prices.create(
            {
              currency: currency.toLowerCase(),
              unit_amount: Math.round((row.unit_amount ?? 0) * 100),
              recurring: { interval: 'month' },
              product_data: { name: row.description },
            },
            stripeOpts
          )

          const subscription = await stripe.subscriptions.create(
            {
              customer: stripeCustomer.id,
              items: [{ price: price.id, quantity: row.quantity }],
              collection_method: 'send_invoice',
              days_until_due: dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30,
              metadata: { crm_client_id: clientId, crm_invoice_id: stripeInvoice.id, is_invoice_item: 'true' },
            },
            stripeOpts
          )

          await stripe.invoiceItems.create(
            {
              customer: stripeCustomer.id,
              invoice: stripeInvoice.id,
              description: `${row.description} (Monthly recurring)`,
              quantity: row.quantity,
              unit_amount_decimal: String(Math.round((row.unit_amount ?? 0) * 100)),
              currency: currency.toLowerCase(),
              subscription: subscription.id,
            },
            stripeOpts
          )
        }

        const finalInvoice = await stripe.invoices.retrieve(stripeInvoice.id, stripeOpts)
        await stripe.invoices.finalizeInvoice(stripeInvoice.id, stripeOpts)
        await stripe.invoices.sendInvoice(stripeInvoice.id, stripeOpts)

        invoiceRecord.stripe_invoice_id = finalInvoice.id
        invoiceRecord.status = 'sent'
      } catch (stripeError) {
        console.error('Stripe error:', stripeError)
        invoiceRecord.status = 'draft'
      }
    }

    const { data: inserted, error } = await supabase
      .from('invoices')
      .insert([{
        ...invoiceRecord,
        sent_at: invoiceRecord.status === 'sent' ? new Date().toISOString() : null,
      }])
      .select('id, client_id, job_id, status, currency, amount_total, amount_due, due_date, stripe_invoice_id, created_at')
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      invoice: {
        ...inserted,
        client: { id: client.id, name: client.name, email: client.email },
      },
      message: stripeSecretKey ? 'Invoice sent via Stripe.' : 'Stripe key not set — invoice saved as draft. Add STRIPE_SECRET_KEY to send via Stripe.',
    })
  } catch (err) {
    console.error('invoices/send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
