import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAuthClient } from '@/lib/supabase/server'
import { crmPath } from '@/lib/crm-path'
import { fromZonedTime } from 'date-fns-tz'
import type { UserRole } from '@/types/database'
import { RevenueChart } from './revenue-chart'
import { DashboardRevenueChart } from './dashboard-revenue-chart'
import { DashboardHeroCreateButton } from './dashboard-hero-create-button'
import { StatCard } from './stat-card'
import { JobCard } from './job-card'
import { MiniCalendar } from './mini-calendar'
import { CrewList } from './crew-list'
import { RecentActivity } from './recent-activity'

export const dynamic = 'force-dynamic'

const DEFAULT_TIMEZONE = 'America/Toronto'

/** Today's date (YYYY-MM-DD) in the given timezone. */
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

/** Date (YYYY-MM-DD) of a UTC timestamp in the given timezone. */
function getDateInTimezone(utcDate: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(utcDate)
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  const s = `${get('year')}-${get('month')}-${get('day')}`.replace(/\//g, '-')
  const [y, m, day] = s.split(/[-/]/).map((x) => x.padStart(2, '0'))
  return `${y}-${m}-${day}`
}

const currency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

/** Friendly date e.g. "Wednesday, February 26" in org timezone */
function getFriendlyDate(dateStr: string, timeZone: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' })
}

/** Greeting based on hour in org timezone */
function getGreeting(dateStr: string, timeZone: string): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, hour: 'numeric', hour12: false }).formatToParts(now)
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '12', 10)
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, display_name, role')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return (
      <div style={{ padding: 24, color: 'var(--text-2)' }}>
        No organization assigned. Contact an admin.
      </div>
    )
  }

  // Use org timezone so "today" matches the business day (same as Jobs page)
  let timeZone = DEFAULT_TIMEZONE
  let subscriptionPlan: string | null = null
  const { data: org } = await supabase.from('organizations').select('timezone, subscription_plan').eq('id', orgId).single()
  if (org?.timezone) timeZone = org.timezone
  subscriptionPlan = org?.subscription_plan ?? null
  const todayStr = getTodayInTimezone(timeZone)
  const { start: todayStart, end: todayEnd } = getDayRangeInUtc(todayStr, timeZone)
  const todayStartStr = todayStart.toISOString()
  const todayEndStr = todayEnd.toISOString()

  const today = todayStart
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)
  const monthStartStr = monthStart.toISOString()
  const monthEndStr = monthEnd.toISOString()
  const utcNow = new Date()
  const utcMonthStartStr = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1)).toISOString()

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
  // Last 30 days including today (so chart shows today's revenue)
  const [todayY, todayM, todayD] = todayStr.split('-').map(Number)
  const chartStartDate = new Date(todayY, todayM - 1, todayD - 29)
  const chartStartStr = `${chartStartDate.getFullYear()}-${String(chartStartDate.getMonth() + 1).padStart(2, '0')}-${String(chartStartDate.getDate()).padStart(2, '0')}`
  const { start: chartRangeStart } = getDayRangeInUtc(chartStartStr, timeZone)

  const [
    { data: todayJobsData },
    { count: jobsTodayCount },
    { data: orgJobIds },
    { data: crewProfiles },
    { data: recentJobs },
    { data: monthJobsForCalendar },
    jobsThisMonthResult,
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, scheduled_at, status, address, base_price, size_price_offset, clients(name), vehicles(year, make, model, color), services(name, base_price), job_upsells(price)')
      .eq('org_id', orgId)
      .gte('scheduled_at', todayStartStr)
      .lt('scheduled_at', todayEndStr)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('scheduled_at', todayStartStr)
      .lt('scheduled_at', todayEndStr),
    supabase.from('jobs').select('id').eq('org_id', orgId),
    supabase
      .from('profiles')
      .select('id, display_name, role, avatar_url')
      .eq('org_id', orgId),
    supabase
      .from('jobs')
      .select('id, status, updated_at, clients(name), services(name)')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('jobs')
      .select('scheduled_at')
      .eq('org_id', orgId)
      .gte('scheduled_at', monthStartStr)
      .lte('scheduled_at', monthEndStr),
    subscriptionPlan === 'starter'
      ? supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', utcMonthStartStr)
      : { count: null as number | null },
  ])

  const jobIds = (orgJobIds ?? []).map((j) => j.id)
  if (jobIds.length === 0) {
    // No jobs in org — avoid .in('job_id', []) which can behave oddly
  }

  const [
    { data: paymentsToday },
    { data: paymentsMonth },
    { data: paymentsLastMonth },
    { data: paymentsChart },
  ] = await Promise.all([
    jobIds.length > 0
      ? supabase
          .from('job_payments')
          .select('amount')
          .in('job_id', jobIds)
          .gte('created_at', todayStartStr)
          .lt('created_at', todayEndStr)
      : { data: [] as { amount: number }[] },
    jobIds.length > 0
      ? supabase
          .from('job_payments')
          .select('amount')
          .in('job_id', jobIds)
          .gte('created_at', monthStartStr)
          .lte('created_at', monthEndStr)
      : { data: [] as { amount: number }[] },
    jobIds.length > 0
      ? supabase
          .from('job_payments')
          .select('amount')
          .in('job_id', jobIds)
          .gte('created_at', lastMonthStart.toISOString())
          .lte('created_at', lastMonthEnd.toISOString())
      : { data: [] as { amount: number }[] },
    jobIds.length > 0
      ? supabase
          .from('job_payments')
          .select('amount, created_at')
          .in('job_id', jobIds)
          .gte('created_at', chartRangeStart.toISOString())
          .lt('created_at', todayEndStr)
          .order('created_at', { ascending: true })
      : { data: [] as { amount: number; created_at: string }[] },
  ])

  const todayRevenue = (paymentsToday ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const monthRevenue = (paymentsMonth ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const lastMonthRevenue = (paymentsLastMonth ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const paidJobsThisMonth = (paymentsMonth ?? []).length
  const avgJobValue = paidJobsThisMonth > 0 ? monthRevenue / paidJobsThisMonth : 0
  const monthDelta = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

  const chartByDate: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const [y, m, day] = todayStr.split('-').map(Number)
    const d = new Date(y, m - 1, day - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    chartByDate[key] = 0
  }
  for (const p of paymentsChart ?? []) {
    const key = getDateInTimezone(new Date((p.created_at as string)), timeZone)
    if (key in chartByDate) chartByDate[key] += Number(p.amount)
  }
  const chartData = Object.entries(chartByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, revenue]) => ({ date, revenue }))

  let todayJobs: Record<string, unknown>[] = todayJobsData ?? []
  if (todayJobs.length === 0 && (jobsTodayCount ?? 0) > 0) {
    const { data: fallbackJobs } = await supabase
      .from('jobs')
      .select('id, scheduled_at, status, address, base_price, size_price_offset, clients(name), vehicles(year, make, model, color), services(name, base_price), job_upsells(price)')
      .eq('org_id', orgId)
      .gte('scheduled_at', todayStartStr)
      .lt('scheduled_at', todayEndStr)
      .order('scheduled_at', { ascending: true })
    todayJobs = fallbackJobs ?? []
  }

  const jobDates = [...new Set((monthJobsForCalendar ?? []).map((j) => (j.scheduled_at as string).slice(0, 10)))]

  const jobsThisMonthCount = subscriptionPlan === 'starter' && jobsThisMonthResult && 'count' in jobsThisMonthResult
    ? (jobsThisMonthResult as { count: number | null }).count ?? 0
    : null

  const activityItems = (recentJobs ?? []).map((j) => {
    const clientsRaw = j.clients as { name?: string } | { name?: string }[] | null
    const servicesRaw = j.services as { name?: string } | { name?: string }[] | null
    const client = Array.isArray(clientsRaw) ? clientsRaw[0] : clientsRaw
    const service = Array.isArray(servicesRaw) ? servicesRaw[0] : servicesRaw
    const name = client?.name ?? 'Job'
    const svc = service?.name ?? '—'
    return {
      id: j.id,
      title: `${name} · ${svc}`,
      subtitle: new Date(j.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      dotColor: j.status === 'done' ? 'var(--green)' : j.status === 'in_progress' ? 'var(--amber)' : 'var(--blue)',
    }
  })

  const crew = (crewProfiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.display_name,
    role: p.role ?? 'member',
    avatar_url: p.avatar_url,
  }))

  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar - title only on desktop; on mobile the layout header shows the title */}
      <div
        className="hidden md:flex shrink-0 items-center gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-1)]"
      >
        <h1 className="text-lg font-semibold text-[var(--text-1)] m-0">Dashboard</h1>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 md:pr-6">
          <div className="flex flex-col gap-6 md:gap-6">
            {/* Mobile hero: date, greeting, today's revenue — no card, big typography; Create new on right */}
            <div className="md:hidden pt-2 pb-6">
              <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
                {getFriendlyDate(todayStr, timeZone)}
              </p>
              <p className="text-lg mb-4" style={{ color: 'var(--text-2)' }}>
                {getGreeting(todayStr, timeZone)}
                {profile?.display_name?.trim() ? `, ${profile.display_name.split(/\s+/)[0]}` : ''}
              </p>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-4xl font-bold tracking-tight m-0" style={{ color: 'var(--text-1)', fontFamily: "ui-monospace, 'Geist Mono', monospace" }}>
                    {currency(todayRevenue)}
                  </p>
                  <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-3)' }}>Today&apos;s revenue</p>
                </div>
                <DashboardHeroCreateButton />
              </div>
            </div>

            {/* Stats row — 2x2 on mobile, 4 columns on desktop */}
            {subscriptionPlan === 'starter' && jobsThisMonthCount !== null && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-sm text-[var(--text-secondary)]">
                  Jobs this month: <strong className="text-[var(--text)]">{jobsThisMonthCount} / 60</strong>
                </span>
                <Link
                  href={crmPath('/settings/plan')}
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Upgrade to Pro
                </Link>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Today's Revenue"
                value={currency(todayRevenue)}
              />
              <StatCard label="Jobs Today" value={jobsTodayCount ?? 0} />
              <StatCard
                label="Monthly Revenue"
                value={currency(monthRevenue)}
                delta={monthDelta !== 0 ? `${monthDelta > 0 ? '+' : ''}${monthDelta.toFixed(0)}% vs last month` : undefined}
                deltaUp={monthDelta > 0}
              />
              <StatCard
                label="Expected Today"
                value={currency(todayJobs.reduce((sum, job) => {
                  const base = typeof job.base_price === 'number' ? job.base_price : (
                    (() => { const s = Array.isArray(job.services) ? (job.services as {base_price?: number}[])[0] : (job.services as {base_price?: number} | null); return s?.base_price ?? 0 })()
                  )
                  const offset = typeof job.size_price_offset === 'number' ? job.size_price_offset : 0
                  const ups = Array.isArray(job.job_upsells) ? (job.job_upsells as {price: number}[]).reduce((s, u) => s + Number(u.price), 0) : 0
                  return sum + base + offset + ups
                }, 0))}
              />
            </div>

            {/* Revenue chart — breathing room, clean axis labels (Jan 29, Feb 5), area fill */}
            <div
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 md:p-4"
            >
              <div
                className="text-xs font-semibold text-[var(--text-2)] mb-4 md:mb-3 uppercase tracking-wider"
              >
                Revenue (30 days)
              </div>
              <div className="h-[200px] md:h-[240px] w-full">
                <DashboardRevenueChart chartData={chartData} />
              </div>
            </div>

            {/* Today's Jobs — clear section with scannable cards */}
            <div>
              <h2
                className="text-sm font-semibold text-[var(--text-1)] m-0 mb-4 uppercase tracking-wider"
              >
                Today&apos;s Jobs
              </h2>
              {todayJobs.length === 0 ? (
                <div
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] py-10 px-6 text-center text-sm"
                  style={{ color: 'var(--text-3)' }}
                >
                  No jobs scheduled today
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {todayJobs.map((job: Record<string, unknown>) => {
                    const clientsRaw = job.clients as { name?: string } | { name?: string }[] | null
                    const vehiclesRaw = job.vehicles as { year?: number; make?: string; model?: string; color?: string } | { year?: number; make?: string; model?: string; color?: string }[] | null
                    const servicesRaw = job.services as { name?: string; base_price?: number } | { name?: string; base_price?: number }[] | null
                    const client = Array.isArray(clientsRaw) ? clientsRaw[0] : clientsRaw
                    const vehicle = Array.isArray(vehiclesRaw) ? vehiclesRaw[0] : vehiclesRaw
                    const service = Array.isArray(servicesRaw) ? servicesRaw[0] : servicesRaw
                    const clientName = client?.name ?? '—'
                    const vehicleSummary = vehicle
                      ? [vehicle.year, vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' ')
                      : ''
                    const serviceName = service?.name ?? '—'
                    const serviceBase = typeof job.base_price === 'number' ? job.base_price : (service?.base_price ?? 0)
                    const sizeOffset = typeof job.size_price_offset === 'number' ? job.size_price_offset : 0
                    const upsellsArr = Array.isArray(job.job_upsells) ? (job.job_upsells as { price: number }[]) : []
                    const upsellTotal = upsellsArr.reduce((s, u) => s + Number(u.price), 0)
                    const expectedPrice = serviceBase + sizeOffset + upsellTotal
                    return (
                      <JobCard
                        key={job.id as string}
                        id={job.id as string}
                        scheduled_at={job.scheduled_at as string}
                        status={job.status as 'scheduled' | 'in_progress' | 'done' | 'en_route' | 'cancelled' | 'no_show'}
                        address={(job.address as string) ?? ''}
                        clientName={clientName}
                        vehicleSummary={vehicleSummary}
                        serviceName={serviceName}
                        price={expectedPrice}
                        date={todayStr}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - full width below main content on mobile */}
        <div
          className="w-full md:w-[280px] shrink-0 p-4 md:p-5 md:pl-5 md:border-l border-t md:border-t-0 border-[var(--border)] bg-[var(--surface-1)] overflow-y-auto flex flex-col gap-5"
        >
          <MiniCalendar jobDates={jobDates} currentMonth={currentMonth} />
          <CrewList crew={crew} />
          <RecentActivity items={activityItems} />
        </div>
      </div>
    </div>
  )
}
