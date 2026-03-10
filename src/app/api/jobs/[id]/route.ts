import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createClient } from '@/lib/supabase/server'

/**
 * GET /api/jobs/[id] — fetch a single job for edit (modal/popup).
 * Uses createClient() which returns service-role when SUPABASE_SERVICE_ROLE_KEY is set (bypasses RLS).
 * Otherwise uses cookie-based auth; org_id from profile ensures we only return jobs for the user's org.
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

  // createClient() returns service-role when SUPABASE_SERVICE_ROLE_KEY is set (bypasses RLS)
  const client = await createClient()

  const [jobRes, jvRes, jsRes] = await Promise.all([
    client.from('jobs').select(`
      id, customer_id, vehicle_id, service_id, scheduled_at, address, status, notes, size_price_offset, location_id,
      actual_started_at, actual_ended_at, org_id,
      clients(id, name, email, phone, address, stripe_customer_id),
      vehicles(id, make, model, year, color),
      services(id, name, duration_mins),
      job_upsells(price)
    `).eq('id', jobId).eq('org_id', orgId).single(),
    client.from('job_vehicles').select('vehicle_id, size_price_offset').eq('job_id', jobId),
    client.from('job_services').select('service_id, vehicle_id').eq('job_id', jobId),
  ])

  if (jobRes.error || !jobRes.data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    job: jobRes.data,
    job_vehicles: jvRes.data ?? [],
    job_services: jsRes.data ?? [],
  })
}
