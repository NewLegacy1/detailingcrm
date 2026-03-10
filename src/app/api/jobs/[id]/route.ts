import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createClient, createServiceRoleClient } from '@/lib/supabase/server'

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
