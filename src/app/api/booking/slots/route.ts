import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { addMinutes } from 'date-fns'

/** GET /api/booking/slots?slug=xxx&date=YYYY-MM-DD&durationMins=60
 * Returns available slot start times (ISO strings) for the given org date, respecting business hours, existing jobs, and blackouts.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() ?? ''
  const dateStr = req.nextUrl.searchParams.get('date')?.trim() ?? ''
  const durationMins = Math.min(480, Math.max(15, parseInt(req.nextUrl.searchParams.get('durationMins') ?? '60', 10) || 60))

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!dateMatch) return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 })

  const supabase = await createClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, timezone, service_hours_start, service_hours_end, booking_slot_interval_minutes, travel_buffer_minutes, blackout_dates, blackout_ranges')
    .eq('booking_slug', slug)
    .single()

  if (orgError || !org?.id) {
    return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 })
  }

  const tz = (org.timezone as string) || 'America/Toronto'
  const hoursStart = typeof org.service_hours_start === 'number' ? Math.max(0, Math.min(23, org.service_hours_start)) : 9
  const hoursEnd = typeof org.service_hours_end === 'number' ? Math.max(1, Math.min(24, org.service_hours_end)) : 18
  const intervalMins = typeof org.booking_slot_interval_minutes === 'number' && org.booking_slot_interval_minutes >= 5
    ? Math.min(120, org.booking_slot_interval_minutes)
    : 30
  const travelBufferMins = typeof org.travel_buffer_minutes === 'number' && org.travel_buffer_minutes >= 0
    ? Math.min(120, org.travel_buffer_minutes)
    : 20

  const [, y, m, d] = dateMatch.map(Number)
  const dateInTz = new Date(y, m - 1, d)
  const dayStartLocal = new Date(y, m - 1, d, hoursStart, 0, 0, 0)
  const dayEndLocal = new Date(y, m - 1, d, hoursEnd, 0, 0, 0)
  const dayStartUtc = fromZonedTime(dayStartLocal, tz)
  const dayEndUtc = fromZonedTime(dayEndLocal, tz)

  const blackoutDates = (org.blackout_dates as string[] | null) ?? []
  const dateOnlyStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  if (blackoutDates.includes(dateOnlyStr)) {
    return NextResponse.json({ slots: [] })
  }

  const blackoutRanges = (org.blackout_ranges as Array<{ start: string; end: string }> | null) ?? []
  for (const range of blackoutRanges) {
    const start = range.start ? new Date(range.start) : null
    const end = range.end ? new Date(range.end) : null
    if (start && end && dateInTz >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && dateInTz <= new Date(end.getFullYear(), end.getMonth(), end.getDate())) {
      return NextResponse.json({ slots: [] })
    }
  }

  const now = new Date()
  if (dayEndUtc <= now) {
    return NextResponse.json({ slots: [] })
  }

  // When the selected date is "today" in the org's timezone, only show slots that start in the future
  const nowInOrgTz = toZonedTime(now, tz)
  const todayInOrgStr = `${nowInOrgTz.getFullYear()}-${String(nowInOrgTz.getMonth() + 1).padStart(2, '0')}-${String(nowInOrgTz.getDate()).padStart(2, '0')}`
  const isTodayInOrg = dateOnlyStr === todayInOrgStr
  const minSlotStartUtc = isTodayInOrg ? new Date(now.getTime() + 60 * 1000) : null // 1 min buffer

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, scheduled_at, actual_started_at, actual_ended_at, service_id, services(duration_mins)')
    .eq('org_id', org.id)
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
    const durationMins = (svc as { duration_mins?: number } | null)?.duration_mins ?? 60
    const scheduledEnd = addMinutes(scheduledStart, durationMins)
    const start = j.actual_started_at ? new Date(j.actual_started_at) : scheduledStart
    const endAfterJob = j.actual_ended_at ? new Date(j.actual_ended_at) : scheduledEnd
    const end = addMinutes(endAfterJob, travelBufferMins)
    return { start, end }
  })

  const slots: string[] = []
  const cutoffUtc = minSlotStartUtc ?? new Date(0) // when today: only slots starting after now+1min; otherwise no floor
  let slotStartUtc = new Date(dayStartUtc.getTime())
  while (slotStartUtc < dayEndUtc) {
    const slotEndUtc = addMinutes(slotStartUtc, durationMins)
    if (slotEndUtc > dayEndUtc) break

    if (slotStartUtc >= cutoffUtc) {
      const overlaps = busyRanges.some(
        (b) => slotStartUtc < b.end && slotEndUtc > b.start
      )
      if (!overlaps) slots.push(slotStartUtc.toISOString())
    }

    slotStartUtc = addMinutes(slotStartUtc, intervalMins)
  }

  return NextResponse.json({ slots })
}
