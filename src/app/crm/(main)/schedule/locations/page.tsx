import { createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { fromZonedTime } from 'date-fns-tz'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { ScheduleByLocationClient } from './schedule-by-location-client'
import { ChevronLeft } from 'lucide-react'

const DEFAULT_TIMEZONE = 'America/Toronto'

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

export default async function ScheduleLocationsPage({
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
  if (!auth?.userId) redirect('/login?redirectTo=' + crmPath('/schedule/locations'))

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan, timezone')
    .eq('id', orgId ?? '')
    .single()

  if (org?.subscription_plan !== 'pro') {
    return (
      <div className="p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
        <p className="text-[var(--text-muted)]">Schedule by location is available on the Pro plan.</p>
        <Link href={crmPath('/schedule')} className="text-[var(--accent)] underline mt-2 inline-block">Back to schedule</Link>
      </div>
    )
  }

  const timeZone = org?.timezone ?? DEFAULT_TIMEZONE
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

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  let jobsQuery = supabase
    .from('jobs')
    .select(`
      id,
      scheduled_at,
      status,
      address,
      location_id,
      clients(name),
      services(name, duration_mins)
    `)
    .gte('scheduled_at', fetchStart.toISOString())
    .lt('scheduled_at', fetchEnd.toISOString())
    .order('scheduled_at', { ascending: true })
    .eq('org_id', orgId!)
  const { data: jobs } = await jobsQuery

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-4">
        <Link
          href={crmPath('/schedule')}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Schedule
        </Link>
      </div>
      <h1 className="page-title" style={{ color: 'var(--text-1)' }}>Schedule by location</h1>
      <ScheduleByLocationClient
        initialDate={dateParam ?? todayInOrg}
        locations={locations ?? []}
        jobs={jobs ?? []}
        timeZone={timeZone}
      />
    </div>
  )
}
