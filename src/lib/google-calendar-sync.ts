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
    .select('id, status, scheduled_at, address, notes, assigned_tech_id, google_company_event_id, customer_id, vehicle_id, service_id')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return { synced: false, error: jobError?.message ?? 'Job not found' }
  }

  const jobRow = job as { customer_id?: string; vehicle_id?: string; service_id?: string }
  let client: { name: string } | null = null
  let vehicle: { make: string; model: string; year: number | null } | null = null
  let service: { name: string; duration_mins: number } | null = null

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

  const vehicleSummary = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') : ''

  const jobForEvent: JobForEvent = {
    id: job.id,
    scheduled_at: job.scheduled_at,
    address: job.address,
    notes: job.notes,
    clientName: client?.name ?? 'Customer',
    vehicleSummary,
    serviceName: service?.name ?? 'Job',
    durationMins: service?.duration_mins ?? 60,
    assigned_tech_id: job.assigned_tech_id,
  }

  const calendarId = org.google_company_calendar_id
  const existingEventId = job.google_company_event_id ?? null

  try {
    if (job.status === 'cancelled' || job.status === 'no_show') {
      if (existingEventId) {
        await deleteEvent(org.google_tokens_encrypted, calendarId, existingEventId)
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
      await updateEvent(org.google_tokens_encrypted, calendarId, existingEventId, jobForEvent)
      await supabase
        .from('jobs')
        .update({
          google_sync_status: 'synced',
          google_last_synced_at: new Date().toISOString(),
          google_last_sync_error: null,
        })
        .eq('id', jobId)
    } else {
      const eventId = await createEvent(org.google_tokens_encrypted, calendarId, jobForEvent)
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