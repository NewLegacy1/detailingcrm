import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncJobToGoogle } from '@/lib/google-calendar-sync'

/** Public booking submit: create customer (client) + job. Uses service role so unauthenticated visitors can create. */
export async function POST(req: NextRequest) {
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
  const customer = body.customer && typeof body.customer === 'object' ? body.customer : {}
  const vehicleInput = body.vehicle && typeof body.vehicle === 'object' ? body.vehicle : {}

  const jobNotes = [notesRaw, sizeKey ? `Vehicle size: ${sizeKey}` : null].filter(Boolean).join('\n') || null


  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 })
  if (!scheduledAt) return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 })
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

  const name = typeof customer.name === 'string' ? customer.name.trim() : ''
  const email = typeof customer.email === 'string' ? customer.email.trim() : null
  const phone = typeof customer.phone === 'string' ? customer.phone.trim() : null
  if (!name) return NextResponse.json({ error: 'customer.name required' }, { status: 400 })

  const scheduledDate = new Date(scheduledAt)
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 })
  }
  if (scheduledDate.getTime() < Date.now()) {
    return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('booking_slug', slug)
    .single()

  if (orgError || !org?.id) {
    return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 })
  }

  const orgId = org.id

  const { data: orgPlan } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()

  if (orgPlan?.subscription_plan === 'starter') {
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', startOfMonth)
    if ((count ?? 0) >= 60) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      return NextResponse.json(
        {
          error: 'Starter plan is limited to 60 jobs per month. Upgrade to Pro for unlimited jobs.',
          upgradeUrl: `${baseUrl}/crm/settings/plan`,
        },
        { status: 403 }
      )
    }
  }

  const { data: service, error: svcError } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('org_id', orgId)
    .single()

  if (svcError || !service?.id) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const { data: newClient, error: clientError } = await supabase
    .from('clients')
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      org_id: orgId,
    })
    .select('id')
    .single()

  if (clientError || !newClient?.id) {
    console.error('Booking client insert:', clientError)
    return NextResponse.json({ error: clientError?.message ?? 'Failed to create customer' }, { status: 500 })
  }

  let vehicleId: string | null = null
  const make = typeof vehicleInput.make === 'string' ? vehicleInput.make.trim() : ''
  const model = typeof vehicleInput.model === 'string' ? vehicleInput.model.trim() : ''
  if (make || model) {
    const year =
      typeof vehicleInput.year === 'number' && !Number.isNaN(vehicleInput.year)
        ? vehicleInput.year
        : typeof vehicleInput.year === 'string'
          ? parseInt(String(vehicleInput.year).trim(), 10)
          : null
    const color = typeof vehicleInput.color === 'string' ? vehicleInput.color.trim() || null : null
    const { data: newVehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        customer_id: newClient.id,
        make: make || 'Unknown',
        model: model || 'Unknown',
        year: Number.isInteger(year) ? year : null,
        color,
      })
      .select('id')
      .single()
    if (!vehicleError && newVehicle?.id) vehicleId = newVehicle.id
  }

  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      customer_id: newClient.id,
      vehicle_id: vehicleId,
      service_id: serviceId,
      scheduled_at: scheduledDate.toISOString(),
      address,
      status: 'scheduled',
      org_id: orgId,
      notes: jobNotes,
      base_price: basePrice,
      size_price_offset: sizePriceOffset,
    })
    .select('id')
    .single()

  if (jobError || !newJob?.id) {
    console.error('Booking job insert:', jobError)
    return NextResponse.json({ error: jobError?.message ?? 'Failed to create booking' }, { status: 500 })
  }

  const jobId = newJob.id

  // Save selected upsells
  if (upsellsInput.length > 0) {
    try {
      await supabase.from('job_upsells').insert(
        upsellsInput.map((u) => ({
          job_id: jobId,
          upsell_id: u.id || null,
          name: u.name,
          price: Number(u.price) || 0,
        }))
      )
    } catch (_) {}
  }

  try {
    const { data: defaultItems } = await supabase
      .from('organization_default_checklist')
      .select('label, sort_order')
      .eq('org_id', orgId)
      .order('sort_order')
    if (defaultItems?.length) {
      await supabase.from('job_checklist_items').insert(
        defaultItems.map((item) => ({ job_id: jobId, label: item.label, sort_order: item.sort_order, checked: false }))
      )
    }
  } catch (_) {}

  // Sync the new job to Google Calendar if org has it connected (service role can read org tokens)
  try {
    const result = await syncJobToGoogle(supabase, orgId, jobId)
    if (result.synced) {
      console.info('[Booking] Google Calendar sync OK for job', jobId)
    } else {
      console.error('[Booking] Google Calendar sync failed for job', jobId, result.error ?? 'unknown')
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error('[Booking] Google Calendar sync error for job', jobId, err.message)
    if (err.message.includes('TOKEN_ENCRYPTION_SECRET')) {
      console.error('[Booking] Ensure TOKEN_ENCRYPTION_SECRET is set (32+ chars) in this environment.')
    }
  }

  return NextResponse.json({ success: true, jobId })
}
