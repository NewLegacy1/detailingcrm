/**
 * Server-only: sync a single job to Google Calendar (company calendar).
 * Used by the CRM sync API route when creating or updating jobs.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createEvent,
  updateEvent,
  deleteEvent,
  type JobForEvent,
  type OnTokensRefreshed,
} from '@/lib/google-calendar'

export async function syncJobToGoogle(
  supabase: SupabaseClient,
  orgId: string,
  jobId: string
): Promise<{ synced: boolean; error?: string }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('google_tokens_encrypted, google_company_calendar_id, google_sync_to_company')
    .eq('id', orgId)
    .single()

  if (!org?.google_tokens_encrypted || !org.google_company_calendar_id || !org.google_sync_to_company) {
    const reason = !org
      ? 'org not found'
      : !org.google_tokens_encrypted
        ? 'Google not connected (no tokens)'
        : !org.google_company_calendar_id
          ? 'No company calendar selected'
          : 'Sync to company calendar is off'
    return { synced: false, error: reason }
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, status, scheduled_at, address, notes, assigned_tech_id, google_company_event_id, customer_id, vehicle_id, service_id, location_id')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return { synced: false, error: jobError?.message ?? 'Job not found' }
  }

  const jobRow = job as { customer_id?: string; vehicle_id?: string; service_id?: string; location_id?: string | null }
  let client: { name: string } | null = null
  let vehicle: { make: string; model: string; year: number | null } | null = null
  let service: { name: string; duration_mins: number } | null = null
  let locationName: string | null = null
  let locationCalendarId: string | null = null
  if (jobRow.location_id) {
    const { data: loc } = await supabase.from('locations').select('name, google_calendar_id').eq('id', jobRow.location_id).single()
    if (loc?.name) locationName = loc.name
    if (loc?.google_calendar_id) locationCalendarId = loc.google_calendar_id
  }

  if (jobRow.customer_id) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', jobRow.customer_id)
      .single()
    if (clientRow) client = { name: clientRow.name }
  }
  if (jobRow.vehicle_id) {
    const { data: vehicleRow } = await supabase
      .from('vehicles')
      .select('make, model, year')
      .eq('id', jobRow.vehicle_id)
      .single()
    if (vehicleRow) vehicle = vehicleRow
  }
  if (jobRow.service_id) {
    const { data: serviceRow } = await supabase
      .from('services')
      .select('name, duration_mins')
      .eq('id', jobRow.service_id)
      .single()
    if (serviceRow) service = serviceRow
  }

  const { data: jvRows } = await supabase.from('job_vehicles').select('vehicle_id').eq('job_id', jobId)
  const { data: jsRows } = await supabase.from('job_services').select('service_id, vehicle_id').eq('job_id', jobId)
  const vehicleIds = (jvRows ?? []).map((r: { vehicle_id: string }) => r.vehicle_id)
  const hasJobServices = (jsRows ?? []).length > 0
  const useMulti = vehicleIds.length > 0 || hasJobServices

  let vehiclesWithServices: { vehicleSummary: string; serviceNames: string[] }[] | undefined
  let totalDurationMins = service?.duration_mins ?? 60
  let serviceNameForTitle = service?.name ?? 'Job'

  if (useMulti) {
    let vidList = vehicleIds.length > 0 ? vehicleIds : [...new Set((jsRows ?? []).map((r: { vehicle_id: string | null }) => r.vehicle_id).filter(Boolean))] as string[]
    if (vidList.length === 0 && jobRow.vehicle_id) vidList = [jobRow.vehicle_id]
    const serviceIds = [...new Set((jsRows ?? []).map((r: { service_id: string }) => r.service_id))]
    const [vehicleRows, serviceRows] = await Promise.all([
      vidList.length > 0 ? supabase.from('vehicles').select('id, make, model, year').in('id', vidList) : { data: [] },
      serviceIds.length > 0 ? supabase.from('services').select('id, name, duration_mins').in('id', serviceIds) : { data: [] },
    ])
    const vehiclesById = (vehicleRows?.data ?? []).reduce((acc: Record<string, { make: string; model: string; year: number | null }>, r: { id: string; make: string; model: string; year: number | null }) => {
      acc[r.id] = r
      return acc
    }, {})
    const servicesById = (serviceRows?.data ?? []).reduce((acc: Record<string, { name: string; duration_mins: number }>, r: { id: string; name: string; duration_mins: number }) => {
      acc[r.id] = r
      return acc
    }, {})
    totalDurationMins = 0
    const firstServiceNames: string[] = []
    vehiclesWithServices = vidList.map((vid) => {
      const v = vehiclesById[vid]
      const summary = v ? [v.year, v.make, v.model].filter(Boolean).join(' ').trim() || 'Vehicle' : 'Vehicle'
      const serviceIdsForV = (jsRows ?? [])
        .filter((r: { vehicle_id: string | null }) => (r.vehicle_id ?? vid) === vid)
        .map((r: { service_id: string }) => r.service_id)
      const names = serviceIdsForV.map((sid) => servicesById[sid]?.name ?? '').filter(Boolean)
      serviceIdsForV.forEach((sid) => { totalDurationMins += servicesById[sid]?.duration_mins ?? 0 })
      if (firstServiceNames.length === 0 && names.length > 0) firstServiceNames.push(...names)
      return { vehicleSummary: summary, serviceNames: names.length > 0 ? names : ['Detailing'] }
    })
    if (firstServiceNames.length > 0) serviceNameForTitle = firstServiceNames.length > 1 ? firstServiceNames.join(' + ') : firstServiceNames[0]
    if (totalDurationMins <= 0) totalDurationMins = service?.duration_mins ?? 60
  }

  const vehicleSummary = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') : ''

  const jobForEvent: JobForEvent = {
    id: job.id,
    scheduled_at: job.scheduled_at,
    address: job.address,
    notes: job.notes,
    clientName: client?.name ?? 'Customer',
    vehicleSummary,
    serviceName: serviceNameForTitle,
    durationMins: totalDurationMins,
    assigned_tech_id: job.assigned_tech_id,
    locationName: locationName ?? undefined,
    vehiclesWithServices,
  }

  const calendarId = locationCalendarId ?? org.google_company_calendar_id
  const existingEventId = job.google_company_event_id ?? null

  const onTokensRefreshed: OnTokensRefreshed = async (newEncrypted) => {
    await supabase
      .from('organizations')
      .update({ google_tokens_encrypted: newEncrypted, updated_at: new Date().toISOString() })
      .eq('id', orgId)
  }

  try {
    if (job.status === 'cancelled' || job.status === 'no_show') {
      if (existingEventId) {
        await deleteEvent(org.google_tokens_encrypted, calendarId, existingEventId, onTokensRefreshed)
      }
      await supabase
        .from('jobs')
        .update({
          google_company_event_id: null,
          google_sync_status: 'synced',
          google_last_synced_at: new Date().toISOString(),
          google_last_sync_error: null,
        })
        .eq('id', jobId)
      return { synced: true }
    }

    if (existingEventId) {
      await updateEvent(org.google_tokens_encrypted, calendarId, existingEventId, jobForEvent, onTokensRefreshed)
      await supabase
        .from('jobs')
        .update({
          google_sync_status: 'synced',
          google_last_synced_at: new Date().toISOString(),
          google_last_sync_error: null,
        })
        .eq('id', jobId)
    } else {
      const eventId = await createEvent(org.google_tokens_encrypted, calendarId, jobForEvent, onTokensRefreshed)
      await supabase
        .from('jobs')
        .update({
          google_company_event_id: eventId,
          google_sync_status: 'synced',
          google_last_synced_at: new Date().toISOString(),
          google_last_sync_error: null,
        })
        .eq('id', jobId)
    }
    return { synced: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    await supabase
      .from('jobs')
      .update({
        google_sync_status: 'failed',
        google_last_sync_error: message,
      })
      .eq('id', jobId)
    return { synced: false, error: message }
  }
}

/**
 * Remove the job's event from Google Calendar (when deleting the job).
 * Call before deleting the job row so we have google_company_event_id and can resolve calendar.
 */
export async function deleteJobEventFromGoogle(
  supabase: SupabaseClient,
  orgId: string,
  jobId: string
): Promise<{ deleted: boolean; error?: string }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('google_tokens_encrypted, google_company_calendar_id, google_sync_to_company')
    .eq('id', orgId)
    .single()

  if (!org?.google_tokens_encrypted || !org.google_company_calendar_id || !org.google_sync_to_company) {
    return { deleted: false }
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('google_company_event_id, location_id')
    .eq('id', jobId)
    .single()

  if (jobError || !job || !(job as { google_company_event_id?: string | null }).google_company_event_id) {
    return { deleted: false }
  }

  const eventId = (job as { google_company_event_id: string }).google_company_event_id
  let calendarId = org.google_company_calendar_id
  const locationId = (job as { location_id?: string | null }).location_id
  if (locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('google_calendar_id')
      .eq('id', locationId)
      .single()
    if (loc?.google_calendar_id) calendarId = loc.google_calendar_id
  }

  const onTokensRefreshed: OnTokensRefreshed = async (newEncrypted) => {
    await supabase
      .from('organizations')
      .update({ google_tokens_encrypted: newEncrypted, updated_at: new Date().toISOString() })
      .eq('id', orgId)
  }

  try {
    await deleteEvent(org.google_tokens_encrypted, calendarId, eventId, onTokensRefreshed)
    return { deleted: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete event failed'
    return { deleted: false, error: message }
  }
}