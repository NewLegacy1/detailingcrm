import { createAuthClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { Suspense } from 'react'
import { fromZonedTime } from 'date-fns-tz'
import { JobsViewsClient } from './jobs-views-client'
import { JobsCreatedBanner } from './jobs-created-banner'
import { JobsNewJobButton } from './jobs-new-job-button'
import { StickyJobsCTA } from './sticky-jobs-cta'
import { JobsDateSync } from './jobs-date-sync'
import { Calendar, List } from 'lucide-react'

const DEFAULT_TIMEZONE = 'America/Toronto'

/** Today's date (YYYY-MM-DD) in the given timezone. Use for default day so "today" matches the business. */
function getTodayInTimezone(timeZone: string): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  const s = `${get('year')}-${get('month')}-${get('day')}`.replace(/\//g, '-')
  const [y, m, d] = s.split(/[-/]/).map((x) => x.padStart(2, '0'))
  return `${y}-${m}-${d}`
}

/** Start and end of the given calendar date in org timezone, as UTC (end is exclusive). */
function getDayRangeInUtc(dateStr: string, timeZone: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0)
  const endLocal = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  const start = fromZonedTime(startLocal, timeZone)
  const end = fromZonedTime(endLocal, timeZone)
  return { start, end }
}

/** Default date when none in URL: today in org timezone if we have it, else server local. */
function getDateParam(dateStr: string | undefined, todayFallback: string): string {
  if (dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  return todayFallback
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; job?: string }>
}) {
  const { view, date: dateParam, job: jobIdParam } = await searchParams
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <p className="text-[var(--text-muted)]">Sign in to view jobs.</p>
      </div>
    )
  }

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null

  if (!orgId) {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="flex shrink-0 items-center gap-4 border-b px-4 sm:px-6 h-[52px]" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-[0.95rem] font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>Jobs</h1>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-[var(--text-muted)]">No organization assigned. Contact an admin to get access to jobs.</p>
        </div>
      </div>
    )
  }

  // Org timezone so "today" matches the business day (same as Dashboard)
  let timeZone = DEFAULT_TIMEZONE
  let subscriptionPlan: string | null = null
  const { data: org } = await supabase.from('organizations').select('timezone, subscription_plan').eq('id', orgId).single()
  if (org?.timezone) timeZone = org.timezone
  subscriptionPlan = org?.subscription_plan ?? null
  const todayFallback = getTodayInTimezone(timeZone)
  const date = getDateParam(dateParam, todayFallback)

  // Day range for the selected date in org timezone
  const { start: dayStart, end: dayEnd } = getDayRangeInUtc(date, timeZone)

  const showTable = view === 'list'
  const showDayView = !showTable

  let dayQuery = supabase
    .from('jobs')
    .select(`
      id,
      scheduled_at,
      status,
      address,
      notes,
      paid_at,
      assigned_tech_id,
      vehicle_id,
      service_id,
      base_price,
      size_price_offset,
      clients(id, name),
      job_upsells(price)
    `)
    .gte('scheduled_at', dayStart.toISOString())
    .lt('scheduled_at', dayEnd.toISOString())
    .order('scheduled_at', { ascending: true })
  if (orgId) dayQuery = dayQuery.eq('org_id', orgId)
  const { data: dayJobsRaw, error: dayJobsError } = await dayQuery

  if (dayJobsError) {
    console.error('Jobs query error:', dayJobsError.message)
  }

  const rows = dayJobsRaw ?? []
  const vehicleIds = [...new Set(rows.map((j) => j.vehicle_id).filter(Boolean))] as string[]
  const serviceIds = [...new Set(rows.map((j) => j.service_id).filter(Boolean))] as string[]

  const [vehiclesRes, servicesRes] = await Promise.all([
    vehicleIds.length > 0
      ? supabase.from('vehicles').select('id, make, model, year, color').in('id', vehicleIds)
      : { data: [] as { id: string; make: string; model: string; year: number | null; color: string | null }[] },
    serviceIds.length > 0
      ? supabase.from('services').select('id, name, base_price').in('id', serviceIds)
      : { data: [] as { id: string; name: string; base_price?: number }[] },
  ])

  const vehiclesList = vehiclesRes.data ?? []
  const servicesList = servicesRes.data ?? []
  const jobs = rows.map((j) => ({
    ...j,
    vehicles: j.vehicle_id ? vehiclesList.find((v) => v.id === j.vehicle_id) ?? null : null,
    services: j.service_id ? servicesList.find((s) => s.id === j.service_id) ?? null : null,
  }))
  const jobIds = jobs.map((j) => j.id)

  const expectedTotalForJob = (j: { base_price?: number; size_price_offset?: number; job_upsells?: { price: number }[]; services?: { base_price?: number } | { base_price?: number }[] | null }) => {
    const base = typeof j.base_price === 'number' ? j.base_price : (Array.isArray(j.services) ? (j.services[0] as { base_price?: number })?.base_price : (j.services as { base_price?: number } | null)?.base_price) ?? 0
    const offset = typeof j.size_price_offset === 'number' ? j.size_price_offset : 0
    const ups = Array.isArray(j.job_upsells) ? (j.job_upsells as { price: number }[]).reduce((s, u) => s + Number(u.price), 0) : 0
    return base + offset + ups
  }
  let dayStats = {
    total: jobs.length,
    completed: jobs.filter((j) => j.status === 'done').length,
    revenue: 0,
    avgValue: 0,
    expectedTotal: jobs.reduce((s, j) => s + expectedTotalForJob(j), 0),
  }
  if (jobIds.length > 0) {
    const { data: jobPayments } = await supabase
      .from('job_payments')
      .select('amount')
      .in('job_id', jobIds)
    const revenue = (jobPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
    dayStats.revenue = revenue
    dayStats.avgValue = jobs.length > 0 ? Math.round(revenue / jobs.length) : 0
  }

  const monthStart = new Date(date + 'T12:00:00')
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)
  let monthQuery = supabase
    .from('jobs')
    .select('scheduled_at')
    .gte('scheduled_at', monthStart.toISOString())
    .lt('scheduled_at', monthEnd.toISOString())
  if (orgId) monthQuery = monthQuery.eq('org_id', orgId)
  const { data: monthJobs } = await monthQuery
  const datesWithJobs = new Set(
    (monthJobs ?? []).map((j) => new Date(j.scheduled_at).toISOString().slice(0, 10))
  )

  let jobsThisMonthCount: number | null = null
  if (subscriptionPlan === 'starter') {
    const utcNow = new Date()
    const utcMonthStart = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1)).toISOString()
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', utcMonthStart)
    jobsThisMonthCount = count ?? 0
  }

  const techIds = [...new Set(jobs.map((j) => j.assigned_tech_id).filter(Boolean))] as string[]
  let crew: { id: string; display_name: string | null; jobCount: number }[] = []
  if (techIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', techIds)
    const countByTech: Record<string, number> = {}
    jobs.forEach((j) => {
      if (j.assigned_tech_id) {
        countByTech[j.assigned_tech_id] = (countByTech[j.assigned_tech_id] ?? 0) + 1
      }
    })
    crew = (profiles ?? []).map((p) => ({
      id: p.id,
      display_name: p.display_name ?? null,
      jobCount: countByTech[p.id] ?? 0,
    }))
  }

  let listQuery = supabase
    .from('jobs')
    .select(`
      id,
      scheduled_at,
      status,
      address,
      notes,
      paid_at,
      vehicle_id,
      service_id,
      base_price,
      size_price_offset,
      clients(id, name),
      job_upsells(price)
    `)
    .order('scheduled_at', { ascending: false })
    .limit(200)
  if (orgId) listQuery = listQuery.eq('org_id', orgId)
  const { data: allJobsRaw, error: listError } = await listQuery
  if (listError) console.error('Jobs list query error:', listError.message)
  const listRows = allJobsRaw ?? []
  const listVehicleIds = [...new Set(listRows.map((j) => j.vehicle_id).filter(Boolean))] as string[]
  const listServiceIds = [...new Set(listRows.map((j) => j.service_id).filter(Boolean))] as string[]
  const [listVehiclesRes, listServicesRes] = await Promise.all([
    listVehicleIds.length > 0 ? supabase.from('vehicles').select('id, make, model, year, color').in('id', listVehicleIds) : { data: [] as { id: string; make: string; model: string; year: number | null; color: string | null }[] },
    listServiceIds.length > 0 ? supabase.from('services').select('id, name, base_price').in('id', listServiceIds) : { data: [] as { id: string; name: string; base_price?: number }[] },
  ])
  const listVehicles = listVehiclesRes.data ?? []
  const listServices = listServicesRes.data ?? []
  const list = listRows.map((j) => ({
    ...j,
    vehicles: j.vehicle_id ? listVehicles.find((v) => v.id === j.vehicle_id) ?? null : null,
    services: j.service_id ? listServices.find((s) => s.id === j.service_id) ?? null : null,
  }))

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="hidden md:flex shrink-0 items-center gap-4 border-b px-4 sm:px-6 h-[52px]" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-[0.95rem] font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>Jobs</h1>
        <div className="w-px h-4" style={{ background: 'var(--border)' }} aria-hidden />
        <div className="flex gap-1 flex-1">
          {showDayView ? (
            <span
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            >
              <Calendar className="h-3 w-3" />
              Day
            </span>
          ) : (
            <Link
              href={crmPath(`/jobs?date=${date}`)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md transition-colors hover:opacity-90"
              style={{ color: 'var(--text-3)' }}
            >
              <Calendar className="h-3 w-3" />
              Day
            </Link>
          )}
          {showTable ? (
            <span
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            >
              <List className="h-3 w-3" />
              List
            </span>
          ) : (
            <Link
              href={crmPath('/jobs?view=list')}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md transition-colors hover:opacity-90"
              style={{ color: 'var(--text-3)' }}
            >
              <List className="h-3 w-3" />
              List
            </Link>
          )}
        </div>
        <JobsNewJobButton />
      </div>

      <div className="shrink-0 px-4 sm:px-6 py-2 hidden md:block">
        <JobsCreatedBanner />
      </div>
      {subscriptionPlan === 'starter' && jobsThisMonthCount !== null && (
        <div
          className="shrink-0 px-4 sm:px-6 py-2 flex items-center justify-between gap-4 rounded-lg mx-4 sm:mx-6 mb-2 border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
        >
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>
            Jobs this month: <strong style={{ color: 'var(--text-1)' }}>{jobsThisMonthCount} / 60</strong>
          </span>
          <Link
            href={crmPath('/settings/plan')}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Upgrade to Pro
          </Link>
        </div>
      )}

      <Suspense fallback={null}>
        <JobsDateSync />
      </Suspense>

      <Suspense fallback={<div className="flex-1 p-6 text-[#4a5568]">Loading…</div>}>
        <JobsViewsClient
          showDayView={showDayView}
          showTable={showTable}
          dayJobs={jobs}
          date={date}
          dayStats={dayStats}
          listJobs={list}
          datesWithJobs={Array.from(datesWithJobs)}
          crew={crew}
          initialJobId={jobIdParam ?? undefined}
          timeZone={timeZone}
          todayStr={todayFallback}
        />
      </Suspense>
      <StickyJobsCTA />
    </div>
  )
}
