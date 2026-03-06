import type { SupabaseClient } from '@supabase/supabase-js'

/** Pending booking row as returned from pending_bookings select. */
export type PendingBookingRow = {
  id: string
  org_id: string
  slug: string
  service_id: string
  scheduled_at: string
  address: string
  customer: { name?: string; email?: string; phone?: string }
  vehicle?: { make?: string; model?: string; year?: number; color?: string } | null
  size_key: string | null
  base_price: number
  size_price_offset: number
  upsells: { id?: string; name: string; price: number }[]
  notes: string | null
  deposit_amount_cents?: number
  discount_amount?: number
  location_id?: string | null
}

/**
 * Create client, vehicle, job, job_upsells, job_payments, default checklist from a completed
 * pending booking. Used by Stripe webhook and by the success-page fallback (complete-session).
 * Idempotent: callers should only invoke this when pending.status === 'pending'.
 * Updates pending_booking to status 'completed' after creating the job.
 */
export async function completePendingBooking(
  supabase: SupabaseClient,
  pending: PendingBookingRow,
  stripeCheckoutSessionId: string
): Promise<{ jobId: string | null; error?: string }> {
  const orgId = pending.org_id
  const customer = pending.customer ?? {}
  const vehicleInput = pending.vehicle ?? {}
  const name = String(customer.name ?? '').trim()
  const email = customer.email ? String(customer.email).trim() : null
  const phone = customer.phone ? String(customer.phone).trim() : null
  const emailNorm = email ? email.toLowerCase() : null
  const phoneNorm = phone ? phone.trim() : null

  let clientId: string
  if (emailNorm) {
    const { data: existingByEmail } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', orgId)
      .ilike('email', emailNorm)
      .limit(1)
      .maybeSingle()
    if (existingByEmail?.id) {
      clientId = existingByEmail.id
      await supabase
        .from('clients')
        .update({
          name: name || 'Booking Customer',
          phone: phoneNorm ?? undefined,
          address: pending.address || undefined,
        })
        .eq('id', clientId)
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: name || 'Booking Customer',
          email: emailNorm,
          phone: phoneNorm || null,
          address: pending.address || null,
          org_id: orgId,
        })
        .select('id')
        .single()
      if (clientError || !newClient?.id) {
        console.error('Booking complete pending: client insert', clientError)
        return { jobId: null, error: clientError?.message ?? 'Client insert failed' }
      }
      clientId = newClient.id
    }
  } else if (phoneNorm) {
    const { data: existingByPhone } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', orgId)
      .eq('phone', phoneNorm)
      .limit(1)
      .maybeSingle()
    if (existingByPhone?.id) {
      clientId = existingByPhone.id
      await supabase
        .from('clients')
        .update({
          name: name || 'Booking Customer',
          address: pending.address || undefined,
        })
        .eq('id', clientId)
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: name || 'Booking Customer',
          email: null,
          phone: phoneNorm,
          address: pending.address || null,
          org_id: orgId,
        })
        .select('id')
        .single()
      if (clientError || !newClient?.id) {
        console.error('Booking complete pending: client insert', clientError)
        return { jobId: null, error: clientError?.message ?? 'Client insert failed' }
      }
      clientId = newClient.id
    }
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: name || 'Booking Customer',
        email: null,
        phone: null,
        address: pending.address || null,
        org_id: orgId,
      })
      .select('id')
      .single()
    if (clientError || !newClient?.id) {
      console.error('Booking complete pending: client insert', clientError)
      return { jobId: null, error: clientError?.message ?? 'Client insert failed' }
    }
    clientId = newClient.id
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
        customer_id: clientId,
        make: make || 'Unknown',
        model: model || 'Unknown',
        year,
        color,
      })
      .select('id')
      .single()
    if (newVehicle?.id) vehicleId = newVehicle.id
  }

  const jobNotes = [pending.notes, pending.size_key ? `Vehicle size: ${pending.size_key}` : null]
    .filter(Boolean)
    .join('\n') || null

  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      customer_id: clientId,
      vehicle_id: vehicleId,
      service_id: pending.service_id,
      scheduled_at: pending.scheduled_at,
      address: pending.address,
      status: 'scheduled',
      org_id: orgId,
      location_id: pending.location_id ?? null,
      notes: jobNotes,
      base_price: Number(pending.base_price),
      size_price_offset: Number(pending.size_price_offset),
      discount_amount: Number((pending as { discount_amount?: number }).discount_amount ?? 0),
    })
    .select('id')
    .single()

  if (jobError || !newJob?.id) {
    console.error('Booking complete pending: job insert', jobError)
    return { jobId: null, error: jobError?.message ?? 'Job insert failed' }
  }

  const upsells = Array.isArray(pending.upsells) ? pending.upsells : []
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
  if (depositAmount > 0) {
    await supabase.from('job_payments').insert({
      job_id: newJob.id,
      amount: depositAmount,
      method: 'stripe',
      reference: stripeCheckoutSessionId,
    })
  }
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
  try {
    const { syncJobToGoogle } = await import('@/lib/google-calendar-sync')
    await syncJobToGoogle(supabase, orgId, newJob.id)
  } catch (_) {}

  await supabase
    .from('pending_bookings')
    .update({
      status: 'completed',
      stripe_checkout_session_id: stripeCheckoutSessionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pending.id)

  return { jobId: newJob.id }
}
