import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { fromZonedTime } from 'date-fns-tz'
import { ReportsTabsClient } from './reports-tabs-client'

export const dynamic = 'force-dynamic'

const DEFAULT_TIMEZONE = 'America/Toronto'

function getTodayInTimezone(timeZone: string): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  const s = `${get('year')}-${get('month')}-${get('day')}`.replace(/\//g, '-')
  const [y, m, d] = s.split(/[-/]/).map((x) => x.padStart(2, '0'))
  return `${y}-${m}-${d}`
}

function getDateInTimezone(utcDate: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(utcDate)
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  const s = `${get('year')}-${get('month')}-${get('day')}`.replace(/\//g, '-')
  const [y, m, day] = s.split(/[-/]/).map((x) => x.padStart(2, '0'))
  return `${y}-${m}-${day}`
}

function getDayRangeInUtc(dateStr: string, timeZone: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0)
  const endLocal = new Date(y, m - 1, d + 1, 0, 0, 0, 0)
  const start = fromZonedTime(startLocal, timeZone)
  const end = fromZonedTime(endLocal, timeZone)
  return { start, end }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const auth = await getAuthAndPermissions()
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id ?? null
  const locationId = auth?.locationId ?? null
  const params = await searchParams
  const activeTab = params.tab === 'promo-codes' ? 'promo-codes' : 'overview'

  if (!orgId) {
    return (
      <div className="p-6" style={{ color: 'var(--text-2)' }}>
        No organization assigned. Contact an admin.
      </div>
    )
  }

  let timeZone = DEFAULT_TIMEZONE
  let isPro = false
  const { data: org } = await supabase.from('organizations').select('timezone, subscription_plan').eq('id', orgId).single()
  if (org?.timezone) timeZone = org.timezone
  if (org?.subscription_plan === 'pro') isPro = true

  const todayStr = getTodayInTimezone(timeZone)
  const [y, m, d] = todayStr.split('-').map(Number)
  const chartStart = new Date(y, m - 1, d - 29)
  const chartStartStr = `${chartStart.getFullYear()}-${String(chartStart.getMonth() + 1).padStart(2, '0')}-${String(chartStart.getDate()).padStart(2, '0')}`
  const { start: rangeStart } = getDayRangeInUtc(chartStartStr, timeZone)
  const { end: rangeEnd } = getDayRangeInUtc(todayStr, timeZone)
  rangeEnd.setDate(rangeEnd.getDate() + 1)

  let orgJobsQuery = supabase
    .from('jobs')
    .select('id, service_id, customer_id, scheduled_at')
    .eq('org_id', orgId)
    .gte('scheduled_at', rangeStart.toISOString())
    .lt('scheduled_at', rangeEnd.toISOString())
  if (locationId) orgJobsQuery = orgJobsQuery.eq('location_id', locationId)
  const { data: orgJobsInRange } = await orgJobsQuery

  const jobIdsInRange = (orgJobsInRange ?? []).map((j) => j.id)
  const orgJobIdsForPayments = jobIdsInRange.length > 0 ? jobIdsInRange : []

  const { data: paymentsInRange } = orgJobIdsForPayments.length > 0
    ? await supabase
        .from('job_payments')
        .select('job_id, amount, created_at')
        .in('job_id', orgJobIdsForPayments)
        .gte('created_at', rangeStart.toISOString())
        .lt('created_at', rangeEnd.toISOString())
        .order('created_at', { ascending: true })
    : { data: [] as { job_id: string; amount: number; created_at: string }[] }

  const orgJobs = orgJobsInRange ?? []
  const jobIds = orgJobs.map((j) => j.id)
  const paymentsList = paymentsInRange ?? []
  const serviceIds = [...new Set(orgJobs.map((j) => j.service_id).filter(Boolean))] as string[]
  const clientIds = [...new Set(orgJobs.map((j) => (j as { customer_id?: string }).customer_id).filter(Boolean))] as string[]

  const [{ data: services }, { data: clients }] = await Promise.all([
    serviceIds.length > 0 ? supabase.from('services').select('id, name').in('id', serviceIds) : { data: [] as { id: string; name: string }[] },
    clientIds.length > 0 ? supabase.from('clients').select('id, name').in('id', clientIds).eq('org_id', orgId) : { data: [] as { id: string; name: string }[] },
  ])

  const serviceNames: Record<string, string> = {}
  ;(services ?? []).forEach((s) => { serviceNames[s.id] = s.name ?? '—' })
  const clientNames: Record<string, string> = {}
  ;(clients ?? []).forEach((c) => { clientNames[c.id] = c.name ?? '—' })

  const jobsByJobId: Record<string, { service_id: string | null; customer_id: string | null }> = {}
  orgJobs.forEach((j) => {
    const row = j as { id: string; service_id: string | null; customer_id: string | null }
    jobsByJobId[j.id] = { service_id: row.service_id ?? null, customer_id: row.customer_id ?? null }
  })

  let totalRevenue = 0
  const chartByDate: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const date = new Date(y, m - 1, d - (29 - i))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    chartByDate[key] = 0
  }
  const revByServiceId: Record<string, number> = {}
  const jobCountByServiceId: Record<string, number> = {}
  const jobCountByClientId: Record<string, number> = {}

  for (const j of orgJobs) {
    const sid = j.service_id ?? '_unknown'
    jobCountByServiceId[sid] = (jobCountByServiceId[sid] ?? 0) + 1
    const cid = (j as { customer_id?: string }).customer_id ?? '_unknown'
    jobCountByClientId[cid] = (jobCountByClientId[cid] ?? 0) + 1
  }

  for (const p of paymentsList) {
    const amt = Number(p.amount)
    totalRevenue += amt
    const dateKey = getDateInTimezone(new Date(p.created_at), timeZone)
    if (dateKey in chartByDate) chartByDate[dateKey] += amt
    const job = jobsByJobId[p.job_id]
    if (job?.service_id) {
      revByServiceId[job.service_id] = (revByServiceId[job.service_id] ?? 0) + amt
    }
  }

  const chartData = Object.entries(chartByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, revenue]) => ({ date, revenue }))

  const revByServiceList: [string, number][] = Object.entries(revByServiceId).map(([sid, amount]) => [
    serviceNames[sid] ?? sid,
    amount,
  ] as [string, number]).sort((a, b) => b[1] - a[1])

  const topServices: [string, number][] = Object.entries(jobCountByServiceId)
    .filter(([k]) => k !== '_unknown')
    .map(([sid, count]) => [serviceNames[sid] ?? sid, count] as [string, number])
    .sort((a, b) => b[1] - a[1])

  const rebookRows = Object.entries(jobCountByClientId)
    .filter(([_, count]) => count >= 2)
    .map(([cid, count]) => ({ id: cid, name: clientNames[cid] ?? cid, count }))
    .sort((a, b) => b.count - a.count)

  const dailySalesForExport: [string, number][] = chartData.map((d) => [d.date, d.revenue])
  const jobCount = orgJobs.length
  const avgValue = jobCount > 0 ? totalRevenue / jobCount : 0

  const revenueByServiceBar = revByServiceList.slice(0, 10).map(([label, value]) => ({ label, value }))
  const topServicesBar = topServices.slice(0, 10).map(([label, value]) => ({ label, value }))

  let promoQuery = supabase
    .from('promo_codes')
    .select('id, name, code, used_count, total_discount_amount, usage_limit, uses_per_customer, is_active')
    .eq('org_id', orgId)
    .order('used_count', { ascending: false })
  if (locationId) promoQuery = promoQuery.eq('location_id', locationId)
  const { data: promoRows } = await promoQuery

  const promoStats = (promoRows ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    used_count: p.used_count ?? 0,
    total_discount_amount: p.total_discount_amount ?? 0,
    usage_limit: p.usage_limit,
    uses_per_customer: p.uses_per_customer ?? null,
    is_active: p.is_active ?? true,
  }))

  return (
    <ReportsTabsClient
      activeTab={activeTab}
      isPro={isPro}
      chartData={chartData}
      totalRevenue={totalRevenue}
      jobCount={jobCount}
      avgValue={avgValue}
      rebookCount={rebookRows.length}
      revenueByServiceBar={revenueByServiceBar}
      topServicesBar={topServicesBar}
      rebookRows={rebookRows}
      dailySalesForExport={dailySalesForExport}
      revByServiceList={revByServiceList}
      topServices={topServices}
      promoStats={promoStats}
    />
  )
}
