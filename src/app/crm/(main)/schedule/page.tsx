import Link from 'next/link'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { fromZonedTime } from 'date-fns-tz'
import { crmPath } from '@/lib/crm-path'
import { ScheduleView } from './schedule-view'
import { ScheduleMobileAddButton } from './schedule-mobile-add-button'

const DEFAULT_SERVICE_HOURS_START = 9
const DEFAULT_SERVICE_HOURS_END = 18
const DEFAULT_TIMEZONE = 'America/Toronto'

/** Today's date (YYYY-MM-DD) in the given timezone. Matches dashboard/jobs. */
function getTodayInTimezone(timeZone: string): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  const s = `${get('year')}-${get('month')}-${get('day')}`.replace(/\//g, '-')
  const [y, m, d] = s.split(/[-/]/).map((x) => x.padStart(2, '0'))
  return `${y}-${m}-${d}`
}

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
  searchParams: Promise<{ date?: string; location?: string; job?: string }>
}) {
  const params = await searchParams
  const dateParam = parseDateParam(params.date)
  const initialSelectedJobId = typeof params.job === 'string' && params.job.trim() ? params.job.trim() : undefined

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
  let timeZone = DEFAULT_TIMEZONE
  let orgSubscriptionPlan: string | null = null
  if (orgId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('service_hours_start, service_hours_end, crm_accent_color, timezone, subscription_plan')
      .eq('id', orgId)
      .single()
    if (org?.timezone) timeZone = org.timezone
    if (org?.subscription_plan) orgSubscriptionPlan = org.subscription_plan
    if (org?.service_hours_start != null && org.service_hours_start >= 0 && org.service_hours_start <= 23) serviceHoursStart = org.service_hours_start
    if (org?.service_hours_end != null && org.service_hours_end >= 1 && org.service_hours_end <= 24 && org.service_hours_end > serviceHoursStart) serviceHoursEnd = org.service_hours_end
    if (org?.crm_accent_color?.trim()) calendarAccentColor = org.crm_accent_color.trim()
  }

  let locations: { id: string; name: string }[] = []
  let locationFilterId: string | null = null
  if (!auth?.locationId && orgId && orgSubscriptionPlan === 'pro') {
    const { data: locs } = await supabase
      .from('locations')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    locations = (locs ?? []).map((l) => ({ id: l.id, name: l.name }))
    if (locations.length > 1 && typeof params.location === 'string' && params.location.trim()) {
      const valid = locations.some((l) => l.id === params.location!.trim())
      if (valid) locationFilterId = params.location!.trim()
    }
  }

  const todayInOrg = getTodayInTimezone(timeZone)
  const dateForWeek = dateParam ?? todayInOrg
  const [y, m, day] = dateForWeek.split('-').map(Number)
  const weekStartLocal = new Date(y, m - 1, day, 0, 0, 0, 0)
  const weekDay = weekStartLocal.getDay()
  weekStartLocal.setDate(weekStartLocal.getDate() - weekDay)
  const weekEndLocal = new Date(weekStartLocal)
  weekEndLocal.setDate(weekEndLocal.getDate() + 7)
  const fetchStartLocal = new Date(weekStartLocal)
  fetchStartLocal.setDate(fetchStartLocal.getDate() - 1)
  const fetchEndLocal = new Date(weekEndLocal)
  fetchEndLocal.setDate(fetchEndLocal.getDate() + 1)
  const fetchStart = fromZonedTime(fetchStartLocal, timeZone)
  const fetchEnd = fromZonedTime(fetchEndLocal, timeZone)

  let jobsQuery = supabase
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
  if (orgId) jobsQuery = jobsQuery.eq('org_id', orgId)
  if (auth?.locationId) jobsQuery = jobsQuery.eq('location_id', auth.locationId)
  else if (locationFilterId) jobsQuery = jobsQuery.eq('location_id', locationFilterId)
  const { data: jobs } = await jobsQuery

  const effectiveLocationId = auth?.locationId ?? locationFilterId ?? undefined
  const showLocationFilter = !auth?.locationId && locations.length > 1

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between gap-3 min-w-0">
        <h1 className="page-title min-w-0 truncate" style={{ color: 'var(--text-1)' }}>
          Schedule
        </h1>
        <div className="flex items-center gap-3 shrink-0">
          {orgSubscriptionPlan === 'pro' && (
            <Link href={crmPath('/schedule/locations')} className="text-sm text-[var(--accent)] hover:underline whitespace-nowrap">
              By location
            </Link>
          )}
          <ScheduleMobileAddButton />
        </div>
      </div>
      <ScheduleView
        initialJobs={jobs ?? []}
        initialDate={dateParam ?? todayInOrg}
        timeZone={timeZone}
        serviceHoursStart={serviceHoursStart}
        serviceHoursEnd={serviceHoursEnd}
        calendarAccentColor={calendarAccentColor}
        locationId={effectiveLocationId}
        showLocationFilter={showLocationFilter}
        locations={locations}
        locationFilterParam={params.location ?? undefined}
        initialSelectedJobId={initialSelectedJobId}
      />
    </div>
  )
}
