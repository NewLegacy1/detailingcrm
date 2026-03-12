import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { parseScheduledAtInTimezone } from '@/lib/parse-scheduled-at'

const DEFAULT_TIMEZONE = 'America/Toronto'

/**
 * GET /api/jobs/[id] — fetch a single job for edit (modal/popup).
 * Uses service-role when SUPABASE_SERVICE_ROLE_KEY is set so we always find the job by id, then verify it belongs to the user's org.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await authClient.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const { id: jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  // Prefer service-role so we fetch by id without RLS; then we verify org below
  let client = await createClient()
  try {
    client = await createServiceRoleClient()
  } catch {
    // No service role key: use createClient() (may be auth client)
  }

  // Fetch job by id only so we don't miss jobs with null org_id or data quirks
  const jobRes = await client
    .from('jobs')
    .select(`
      id, customer_id, vehicle_id, service_id, scheduled_at, address, status, notes, size_price_offset, location_id,
      actual_started_at, actual_ended_at, org_id,
      clients(id, name, email, phone, address, stripe_customer_id),
      vehicles(id, make, model, year, color),
      services(id, name, duration_mins),
      job_upsells(price)
    `)
    .eq('id', jobId)
    .single()

  if (jobRes.error || !jobRes.data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const job = jobRes.data as { org_id?: string | null; customer_id?: string }
  const jobOrgId = job.org_id ?? null

  // Ensure job belongs to the user's org
  if (jobOrgId !== null && jobOrgId !== orgId) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (jobOrgId === null && job.customer_id) {
    const { data: clientRow } = await client
      .from('clients')
      .select('org_id')
      .eq('id', job.customer_id)
      .single()
    if (clientRow?.org_id !== orgId) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
  }

  const [jvRes, jsRes] = await Promise.all([
    client.from('job_vehicles').select('vehicle_id, size_price_offset').eq('job_id', jobId),
    client.from('job_services').select('service_id, vehicle_id').eq('job_id', jobId),
  ])

  return NextResponse.json({
    job: jobRes.data,
    job_vehicles: jvRes.data ?? [],
    job_services: jsRes.data ?? [],
  })
}

type VehicleServiceLine = { vehicle_id: string; service_id: string }

/**
 * PATCH /api/jobs/[id] — update job (e.g. from schedule modal). Parses scheduled_at in org timezone.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await authClient.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  const { id: jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  let body: {
    customer_id?: string
    vehicle_ids?: string[]
    vehicle_services?: Record<string, string[]>
    vehicle_sizes?: Record<string, number>
    scheduled_at?: string
    address?: string
    status?: string
    notes?: string | null
    location_id?: string | null
    actual_started_at?: string | null
    actual_ended_at?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let client = await createClient()
  try {
    client = await createServiceRoleClient()
  } catch {
    // use auth client
  }

  const jobRes = await client
    .from('jobs')
    .select('id, org_id, customer_id, actual_started_at, actual_ended_at')
    .eq('id', jobId)
    .single()

  if (jobRes.error || !jobRes.data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const job = jobRes.data as { org_id?: string | null; customer_id?: string }
  const jobOrgId = job.org_id ?? null
  if (jobOrgId !== null && jobOrgId !== orgId) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (jobOrgId === null && job.customer_id) {
    const { data: clientRow } = await client
      .from('clients')
      .select('org_id')
      .eq('id', job.customer_id)
      .single()
    if (clientRow?.org_id !== orgId) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
  }

  const { data: org } = await client
    .from('organizations')
    .select('timezone')
    .eq('id', orgId)
    .single()
  const timeZone = (org?.timezone as string) || DEFAULT_TIMEZONE

  const customer_id = typeof body.customer_id === 'string' ? body.customer_id.trim() : undefined
  const vehicle_ids = Array.isArray(body.vehicle_ids) ? body.vehicle_ids.filter((id): id is string => typeof id === 'string' && id.trim() !== '') : undefined
  const vehicle_services = body.vehicle_services && typeof body.vehicle_services === 'object' ? body.vehicle_services : undefined
  const vehicle_sizes = body.vehicle_sizes && typeof body.vehicle_sizes === 'object' ? body.vehicle_sizes : undefined
  const scheduled_at_raw = typeof body.scheduled_at === 'string' ? body.scheduled_at.trim() : undefined
  const address = typeof body.address === 'string' ? body.address.trim() : undefined
  const status = typeof body.status === 'string' ? body.status : undefined
  const notes = body.notes !== undefined ? (typeof body.notes === 'string' ? body.notes.trim() || null : null) : undefined
  const location_id = body.location_id !== undefined ? (typeof body.location_id === 'string' && body.location_id.trim() ? body.location_id.trim() : null) : undefined

  let scheduled_at_iso: string | undefined
  if (scheduled_at_raw) {
    const parsed = parseScheduledAtInTimezone(scheduled_at_raw, timeZone)
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduled_at' }, { status: 400 })
    }
    scheduled_at_iso = parsed.toISOString()
  }

  const vehicleServicesList: VehicleServiceLine[] = []
  if (vehicle_ids && vehicle_services) {
    vehicle_ids.forEach((vid) => {
      (vehicle_services[vid] ?? []).forEach((sid) => vehicleServicesList.push({ vehicle_id: vid, service_id: sid }))
    })
  }

  let base_price: number | undefined
  let size_price_offset: number | undefined
  const firstVehicleId = vehicle_ids ? (vehicle_ids[0] ?? null) : undefined
  const firstServiceId = vehicleServicesList[0]?.service_id ?? null

  if (vehicle_ids !== undefined) {
    if (vehicleServicesList.length > 0) {
      const serviceIds = [...new Set(vehicleServicesList.map((l) => l.service_id))]
      const { data: servicesData } = await client
        .from('services')
        .select('id, base_price')
        .in('id', serviceIds)
      const priceMap = new Map((servicesData ?? []).map((s) => [s.id, Number((s as { base_price?: number }).base_price) || 0]))
      base_price = vehicleServicesList.reduce((acc, l) => acc + (priceMap.get(l.service_id) ?? 0), 0)
      size_price_offset = vehicle_ids.reduce(
        (sum, vid) => sum + (typeof vehicle_sizes?.[vid] === 'number' ? vehicle_sizes[vid] : 0),
        0
      )
    } else {
      base_price = 0
      size_price_offset = 0
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (customer_id !== undefined) updates.customer_id = customer_id
  if (vehicle_ids !== undefined) {
    updates.vehicle_id = firstVehicleId ?? null
    updates.service_id = firstServiceId ?? null
  }
  if (base_price !== undefined) updates.base_price = base_price
  if (size_price_offset !== undefined) updates.size_price_offset = size_price_offset
  if (scheduled_at_iso !== undefined) updates.scheduled_at = scheduled_at_iso
  if (address !== undefined) updates.address = address
  if (status !== undefined) {
    updates.status = status
    if (status === 'in_progress') {
      updates.actual_started_at = body.actual_started_at ?? (job as { actual_started_at?: string }).actual_started_at ?? new Date().toISOString()
    }
    if (status === 'done') {
      updates.actual_ended_at = body.actual_ended_at ?? (job as { actual_ended_at?: string }).actual_ended_at ?? new Date().toISOString()
      if (!(job as { actual_started_at?: string }).actual_started_at) {
        updates.actual_started_at = body.actual_started_at ?? new Date().toISOString()
      }
    }
  }
  if (notes !== undefined) updates.notes = notes
  if (location_id !== undefined) updates.location_id = location_id

  const { error: updateError } = await client.from('jobs').update(updates).eq('id', jobId)
  if (updateError) {
    return NextResponse.json({ error: updateError.message ?? 'Failed to update job' }, { status: 500 })
  }

  if (vehicle_ids !== undefined) {
    await client.from('job_vehicles').delete().eq('job_id', jobId)
    if (vehicle_ids.length > 0) {
      const sizeOptions = vehicle_sizes ?? {}
      await client.from('job_vehicles').insert(
        vehicle_ids.map((vehicle_id) => {
          const size_price_offset_val = typeof sizeOptions[vehicle_id] === 'number' ? sizeOptions[vehicle_id] : 0
          return { job_id: jobId, vehicle_id, size_price_offset: size_price_offset_val }
        })
      )
    }
  }

  if (vehicleServicesList.length > 0) {
    await client.from('job_services').delete().eq('job_id', jobId)
    await client.from('job_services').insert(
      vehicleServicesList.map((l) => ({ job_id: jobId, service_id: l.service_id, vehicle_id: l.vehicle_id }))
    )
  }

  return NextResponse.json({ ok: true })
}
