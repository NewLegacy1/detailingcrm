import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { ScheduleView } from './schedule-view'

const DEFAULT_SERVICE_HOURS_START = 9
const DEFAULT_SERVICE_HOURS_END = 18

function parseDateParam(dateStr: string | undefined): string | undefined {
  if (!dateStr || typeof dateStr !== 'string') return undefined
  const trimmed = dateStr.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined
  const d = new Date(trimmed + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return undefined
  return trimmed
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const dateParam = parseDateParam(params.date)

  const supabase = await createAuthClient()
  const auth = await getAuthAndPermissions()
  let orgId = auth?.orgId ?? null
  if (!orgId && auth) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  let serviceHoursStart = DEFAULT_SERVICE_HOURS_START
  let serviceHoursEnd = DEFAULT_SERVICE_HOURS_END
  let calendarAccentColor: string | null = null
  if (orgId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('service_hours_start, service_hours_end, crm_accent_color')
      .eq('id', orgId)
      .single()
    if (org?.service_hours_start != null && org.service_hours_start >= 0 && org.service_hours_start <= 23) serviceHoursStart = org.service_hours_start
    if (org?.service_hours_end != null && org.service_hours_end >= 1 && org.service_hours_end <= 24 && org.service_hours_end > serviceHoursStart) serviceHoursEnd = org.service_hours_end
    if (org?.crm_accent_color?.trim()) calendarAccentColor = org.crm_accent_color.trim()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = new Date(today)
  if (dateParam) {
    const d = new Date(dateParam + 'T12:00:00')
    if (!Number.isNaN(d.getTime())) {
      weekStart.setTime(d.getTime())
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
    } else {
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    }
  } else {
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  }
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const fetchStart = new Date(weekStart)
  fetchStart.setDate(fetchStart.getDate() - 1)
  const fetchEnd = new Date(weekEnd)
  fetchEnd.setDate(fetchEnd.getDate() + 1)

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      scheduled_at,
      status,
      address,
      notes,
      actual_started_at,
      actual_ended_at,
      google_company_event_id,
      clients(name),
      services(name, duration_mins)
    `)
    .gte('scheduled_at', fetchStart.toISOString())
    .lt('scheduled_at', fetchEnd.toISOString())
    .order('scheduled_at', { ascending: true })

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <h1 className="page-title hidden md:block" style={{ color: 'var(--text-1)' }}>Schedule</h1>
      <ScheduleView
        initialJobs={jobs ?? []}
        initialDate={dateParam}
        serviceHoursStart={serviceHoursStart}
        serviceHoursEnd={serviceHoursEnd}
        calendarAccentColor={calendarAccentColor}
      />
    </div>
  )
}
