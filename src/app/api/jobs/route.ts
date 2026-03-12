import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { parseScheduledAtInTimezone } from '@/lib/parse-scheduled-at'

const STARTER_JOBS_LIMIT = 60
const DEFAULT_TIMEZONE = 'America/Toronto'

type VehicleServiceLine = { vehicle_id?: string | null; service_id: string }

/**
 * POST: Create a job from the CRM (authenticated). Enforces Starter 60 jobs/month cap.
 * Body: { customer_id, vehicle_ids?, service_ids?, vehicle_services?, scheduled_at, address, notes?, base_price?, size_price_offset?, location_id? }
 * Use vehicle_services: [{ vehicle_id, service_id }] for per-vehicle services (same service can repeat for different vehicles).
 * Legacy: vehicle_ids + service_ids (cartesian: each vehicle gets each service).
 */
export async function POST(req: NextRequest) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = await getAuthAndPermissions()
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  let body: {
    customer_id?: string
    vehicle_id?: string | null
    vehicle_ids?: string[]
    service_id?: string | null
    service_ids?: string[]
    vehicle_services?: VehicleServiceLine[]
    /** Per-vehicle size offset: vehicle_id -> size_price_offset. Used when inserting job_vehicles. */
    vehicle_sizes?: Record<string, number>
    scheduled_at?: string
    address?: string
    notes?: string | null
    base_price?: number
    size_price_offset?: number
    /** Optional: assign job to this location (must belong to org). Overrides auth.locationId. */
    location_id?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let locationId = auth?.locationId ?? null
  if (typeof body.location_id === 'string' && body.location_id.trim()) {
    const locId = body.location_id.trim()
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('id', locId)
      .eq('org_id', orgId)
      .single()
    if (loc?.id) locationId = loc.id
  } else if (body.location_id === null) {
    locationId = null
  }

  const customer_id = typeof body.customer_id === 'string' ? body.customer_id.trim() : ''
  const scheduled_at = typeof body.scheduled_at === 'string' ? body.scheduled_at.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  if (!customer_id || !scheduled_at || !address) {
    return NextResponse.json({ error: 'customer_id, scheduled_at, and address are required' }, { status: 400 })
  }

  // Fetch org timezone so we can parse datetime-local (e.g. from mobile) as org local time, not server UTC
  const { data: orgForTz } = await supabase
    .from('organizations')
    .select('timezone, subscription_plan')
    .eq('id', orgId)
    .single()
  const orgTimezone = (orgForTz?.timezone as string) || DEFAULT_TIMEZONE
  const scheduledDate = parseScheduledAtInTimezone(scheduled_at, orgTimezone)
  if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduled_at' }, { status: 400 })
  }

  const vehicleIds = Array.isArray(body.vehicle_ids)
    ? body.vehicle_ids.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    : (typeof body.vehicle_id === 'string' && body.vehicle_id.trim() ? [body.vehicle_id.trim()] : [])

  let vehicleServices: VehicleServiceLine[] = []
  if (Array.isArray(body.vehicle_services) && body.vehicle_services.length > 0) {
    vehicleServices = body.vehicle_services
      .filter((l): l is VehicleServiceLine => typeof l?.service_id === 'string' && l.service_id.trim() !== '')
      .map((l) => ({
        vehicle_id: typeof l.vehicle_id === 'string' && l.vehicle_id.trim() ? l.vehicle_id.trim() : null,
        service_id: l.service_id.trim(),
      }))
  } else {
    const serviceIds = Array.isArray(body.service_ids)
      ? body.service_ids.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      : (typeof body.service_id === 'string' && body.service_id.trim() ? [body.service_id.trim()] : [])
    for (const vid of vehicleIds.length ? vehicleIds : [null]) {
      for (const sid of serviceIds) {
        vehicleServices.push({ vehicle_id: vid, service_id: sid })
      }
    }
  }

  const uniqueVehicleIds = [...new Set(vehicleServices.map((l) => l.vehicle_id).filter(Boolean))] as string[]
  const allVehicleIds = vehicleIds.length > 0 ? vehicleIds : uniqueVehicleIds

  let base_price = typeof body.base_price === 'number' ? body.base_price : 0
  if (vehicleServices.length > 0) {
    const serviceIdsForPrice = [...new Set(vehicleServices.map((l) => l.service_id))]
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, base_price')
      .in('id', serviceIdsForPrice)
    const priceMap = new Map((servicesData ?? []).map((s) => [s.id, Number((s as { base_price?: number }).base_price) || 0]))
    base_price = vehicleServices.reduce((acc, l) => acc + (priceMap.get(l.service_id) ?? 0), 0)
  }

  if (orgForTz?.subscription_plan === 'starter') {
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', startOfMonth)
    if ((count ?? 0) >= STARTER_JOBS_LIMIT) {
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

  const vehicle_id = allVehicleIds[0] ?? null
  const service_id = vehicleServices[0]?.service_id ?? null
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  const vehicleSizes = body.vehicle_sizes && typeof body.vehicle_sizes === 'object' ? body.vehicle_sizes : {} as Record<string, number>
  const jobLevelOffset = typeof body.size_price_offset === 'number' ? body.size_price_offset : 0
  const size_price_offset =
    allVehicleIds.length > 0 && Object.keys(vehicleSizes).length > 0
      ? allVehicleIds.reduce((sum, vid) => sum + (typeof vehicleSizes[vid] === 'number' ? vehicleSizes[vid] : jobLevelOffset), 0)
      : jobLevelOffset

  const insertPayload: Record<string, unknown> = {
    customer_id,
    vehicle_id,
    service_id,
    scheduled_at: scheduledDate.toISOString(),
    address,
    status: 'scheduled',
    org_id: orgId,
    notes,
    base_price,
    size_price_offset,
  }
  if (locationId) insertPayload.location_id = locationId
  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert(insertPayload)
    .select('id')
    .single()

  if (jobError || !newJob?.id) {
    return NextResponse.json({ error: jobError?.message ?? 'Failed to create job' }, { status: 500 })
  }

  if (allVehicleIds.length > 0) {
    await supabase.from('job_vehicles').insert(
      allVehicleIds.map((vid) => ({
        job_id: newJob.id,
        vehicle_id: vid,
        size_price_offset: typeof vehicleSizes[vid] === 'number' ? vehicleSizes[vid] : jobLevelOffset,
      }))
    )
  }
  if (vehicleServices.length > 0) {
    await supabase.from('job_services').insert(
      vehicleServices.map((l) => ({
        job_id: newJob.id,
        service_id: l.service_id,
        vehicle_id: l.vehicle_id ?? null,
      }))
    )
  }

  try {
    const { data: defaultItems } = await supabase
      .from('organization_default_checklist')
      .select('label, sort_order')
      .eq('org_id', orgId)
      .order('sort_order')
    if (defaultItems?.length) {
      await supabase.from('job_checklist_items').insert(
        defaultItems.map((item) => ({ job_id: newJob.id, label: item.label, sort_order: item.sort_order, checked: false }))
      )
    }
  } catch (_) {}

  return NextResponse.json({ id: newJob.id })
}
