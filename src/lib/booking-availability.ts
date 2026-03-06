/**
 * Multi-location: availability per location. Used by slots API when locationId is present.
 * Does not replace existing org-level slot logic; call this only when locationId is set.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { addMinutes } from 'date-fns'

export interface GetSlotsForLocationParams {
  orgId: string
  locationId: string
  dateStr: string
  durationMins: number
  travelBufferMins?: number
}

export interface LocationSchedule {
  timezone: string
  hours_start: number
  hours_end: number
  slot_interval_minutes: number
  blackout_dates: string[] | null
  blackout_ranges: Array<{ start: string; end: string }> | null
}

/**
 * Returns available slot start times (ISO strings) for one location on one date.
 * Uses location's hours and blackouts; busy ranges from jobs with that location_id.
 */
export async function getSlotsForLocation(
  supabase: SupabaseClient,
  params: GetSlotsForLocationParams
): Promise<string[]> {
  const { orgId, locationId, dateStr, durationMins } = params
  const travelBufferMins = params.travelBufferMins ?? 20
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!dateMatch) return []

  const { data: location } = await supabase
    .from('locations')
    .select('timezone, hours_start, hours_end, slot_interval_minutes, blackout_dates, blackout_ranges')
    .eq('id', locationId)
    .eq('org_id', orgId)
    .single()

  if (!location) return []

  const tz = (location.timezone as string) || 'America/Toronto'
  const hoursStart = typeof location.hours_start === 'number' ? Math.max(0, Math.min(23, location.hours_start)) : 9
  const hoursEnd = typeof location.hours_end === 'number' ? Math.max(1, Math.min(24, location.hours_end)) : 18
  const intervalMins =
    typeof location.slot_interval_minutes === 'number' && location.slot_interval_minutes >= 5
      ? Math.min(120, location.slot_interval_minutes)
      : 30

  const [, y, m, d] = dateMatch.map(Number)
  const dateInTz = new Date(y, m - 1, d)
  const dayStartLocal = new Date(y, m - 1, d, hoursStart, 0, 0, 0)
  const dayEndLocal = new Date(y, m - 1, d, hoursEnd, 0, 0, 0)
  const dayStartUtc = fromZonedTime(dayStartLocal, tz)
  const dayEndUtc = fromZonedTime(dayEndLocal, tz)

  const blackoutDates = (location.blackout_dates as string[] | null) ?? []
  const dateOnlyStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  if (blackoutDates.includes(dateOnlyStr)) return []

  const blackoutRanges = (location.blackout_ranges as Array<{ start: string; end: string }> | null) ?? []
  for (const range of blackoutRanges) {
    const start = range.start ? new Date(range.start) : null
    const end = range.end ? new Date(range.end) : null
    if (
      start &&
      end &&
      dateInTz >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
      dateInTz <= new Date(end.getFullYear(), end.getMonth(), end.getDate())
    ) {
      return []
    }
  }

  const now = new Date()
  if (dayEndUtc <= now) return []

  const nowInOrgTz = toZonedTime(now, tz)
  const todayInOrgStr = `${nowInOrgTz.getFullYear()}-${String(nowInOrgTz.getMonth() + 1).padStart(2, '0')}-${String(nowInOrgTz.getDate()).padStart(2, '0')}`
  const isTodayInOrg = dateOnlyStr === todayInOrgStr
  const minSlotStartUtc = isTodayInOrg ? new Date(now.getTime() + 60 * 1000) : null

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, scheduled_at, actual_started_at, actual_ended_at, service_id, services(duration_mins)')
    .eq('org_id', orgId)
    .eq('location_id', locationId)
    .gte('scheduled_at', dayStartUtc.toISOString())
    .lt('scheduled_at', dayEndUtc.toISOString())
    .in('status', ['scheduled', 'in_progress', 'en_route'])

  type JobRow = {
    scheduled_at: string
    actual_started_at?: string | null
    actual_ended_at?: string | null
    services: { duration_mins: number } | { duration_mins: number }[] | null
  }
  const busyRanges: { start: Date; end: Date }[] = (jobs ?? []).map((j: JobRow) => {
    const scheduledStart = new Date(j.scheduled_at)
    const svc = Array.isArray(j.services) ? j.services[0] : j.services
    const jobDurationMins = (svc as { duration_mins?: number } | null)?.duration_mins ?? 60
    const scheduledEnd = addMinutes(scheduledStart, jobDurationMins)
    const start = j.actual_started_at ? new Date(j.actual_started_at) : scheduledStart
    const endAfterJob = j.actual_ended_at ? new Date(j.actual_ended_at) : scheduledEnd
    const end = addMinutes(endAfterJob, travelBufferMins)
    return { start, end }
  })

  const slots: string[] = []
  const cutoffUtc = minSlotStartUtc ?? new Date(0)
  let slotStartUtc = new Date(dayStartUtc.getTime())
  while (slotStartUtc < dayEndUtc) {
    const slotEndUtc = addMinutes(slotStartUtc, durationMins)
    if (slotEndUtc > dayEndUtc) break
    if (slotStartUtc >= cutoffUtc) {
      const overlaps = busyRanges.some((b) => slotStartUtc < b.end && slotEndUtc > b.start)
      if (!overlaps) slots.push(slotStartUtc.toISOString())
    }
    slotStartUtc = addMinutes(slotStartUtc, intervalMins)
  }
  return slots
}

/**
 * Returns the next available slot ISO string for a location from a given date, or null.
 * Tries up to maxDays ahead.
 */
export async function getNextAvailableSlot(
  supabase: SupabaseClient,
  params: GetSlotsForLocationParams & { maxDays?: number }
): Promise<string | null> {
  const maxDays = params.maxDays ?? 14
  const dateStr = params.dateStr
  const [y, m, d] = dateStr.split('-').map(Number)
  let from = new Date(y, m - 1, d)
  const today = new Date()
  if (from < today) from = today
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`

  for (let i = 0; i < maxDays; i++) {
    const d = new Date(from)
    d.setDate(d.getDate() + i)
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const slots = await getSlotsForLocation(supabase, { ...params, dateStr: str })
    if (slots.length > 0) return slots[0]!
  }
  return null
}
