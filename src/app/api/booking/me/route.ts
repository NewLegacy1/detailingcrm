import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** GET /api/booking/me?slug=xxx
 * Returns client profile, vehicles, and past jobs for the org that owns the slug.
 * Requires authenticated user (booking page customer session).
 */
export async function GET(req: NextRequest) {
  const authClient = await createAuthClient()
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser()

  if (authError || !user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')?.trim().toLowerCase() ?? ''
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
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

  const { data: account, error: accountError } = await supabase
    .from('booking_customer_accounts')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('org_id', org.id)
    .single()

  if (accountError || !account?.client_id) {
    return NextResponse.json(
      { error: 'No customer profile for this business' },
      { status: 404 }
    )
  }

  const clientId = account.client_id

  const [clientRes, vehiclesRes, jobsRes] = await Promise.all([
    supabase.from('clients').select('id, name, email, phone, address').eq('id', clientId).single(),
    supabase
      .from('vehicles')
      .select('id, make, model, year, color')
      .eq('customer_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, scheduled_at, address, status, service_id')
      .eq('customer_id', clientId)
      .eq('org_id', org.id)
      .order('scheduled_at', { ascending: false })
      .limit(50),
  ])

  const client = clientRes.data
  if (!client) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const vehicles = vehiclesRes.data ?? []
  const jobs = jobsRes.data ?? []

  const { data: serviceNames } = await supabase
    .from('services')
    .select('id, name')
    .in('id', [...new Set(jobs.map((j) => j.service_id).filter(Boolean))])

  const serviceMap = new Map((serviceNames ?? []).map((s) => [s.id, s.name]))

  const pastJobs = jobs.map((j) => ({
    id: j.id,
    scheduled_at: j.scheduled_at,
    address: j.address,
    status: j.status,
    service_name: j.service_id ? serviceMap.get(j.service_id) ?? null : null,
  }))

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
    },
    vehicles: vehicles.map((v) => ({
      id: v.id,
      make: v.make ?? '',
      model: v.model ?? '',
      year: v.year ?? null,
      color: v.color ?? '',
    })),
    pastJobs,
  })
}

/** PATCH /api/booking/me?slug=xxx
 * Update the signed-in customer's client profile (name, email, phone, address).
 * Only updates the client linked to this user's booking_customer_accounts for the org.
 */
export async function PATCH(req: NextRequest) {
  const authClient = await createAuthClient()
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser()

  if (authError || !user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')?.trim().toLowerCase() ?? ''
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  let body: { name?: string; email?: string; phone?: string; address?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
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

  const { data: account, error: accountError } = await supabase
    .from('booking_customer_accounts')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('org_id', org.id)
    .single()

  if (accountError || !account?.client_id) {
    return NextResponse.json(
      { error: 'No customer profile for this business' },
      { status: 404 }
    )
  }

  const updates: { name?: string; email?: string | null; phone?: string | null; address?: string | null } = {}
  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (body.email !== undefined) updates.email = typeof body.email === 'string' ? body.email.trim() || null : null
  if (body.phone !== undefined) updates.phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  if (body.address !== undefined) updates.address = typeof body.address === 'string' ? body.address.trim() || null : null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', account.client_id)
    .select('id, name, email, phone, address')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    client: {
      id: updated.id,
      name: updated.name ?? '',
      email: updated.email ?? '',
      phone: updated.phone ?? '',
      address: updated.address ?? '',
    },
  })
}
