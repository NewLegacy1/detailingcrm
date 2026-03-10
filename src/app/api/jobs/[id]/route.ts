import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/jobs/[id] — fetch a single job for edit (modal/popup).
 * Uses service-role when available so RLS/session issues don't block owner. Returns job + job_vehicles + job_services.
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

  let job: unknown = null
  let jobVehicles: unknown[] = []
  let jobServices: unknown[] = []

  let client = authClient
  try {
    client = await createServiceRoleClient()
  } catch {
    // No service role key: use auth client (RLS applies)
  }

  const [jobRes, jvRes, jsRes] = await Promise.all([
    client.from('jobs').select(`
      id, customer_id, vehicle_id, service_id, scheduled_at, address, status, notes, size_price_offset, location_id,
      actual_started_at, actual_ended_at,
      clients(id, name, email, phone, address),
      vehicles(id, make, model, year, color),
      services(id, name, duration_mins)
    `).eq('id', jobId).eq('org_id', orgId).single(),
    client.from('job_vehicles').select('vehicle_id, size_price_offset').eq('job_id', jobId),
    client.from('job_services').select('service_id, vehicle_id').eq('job_id', jobId),
  ])

  if (jobRes.error || !jobRes.data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  job = jobRes.data
  jobVehicles = jvRes.data ?? []
  jobServices = jsRes.data ?? []

  return NextResponse.json({ job, job_vehicles: jobVehicles, job_services: jobServices })
}
