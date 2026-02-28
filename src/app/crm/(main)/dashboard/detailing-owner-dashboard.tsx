import { createAuthClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { DetailingQuickActions } from './detailing-quick-actions'
import { DashboardCharts } from './dashboard-charts'
import { DashboardStatCard } from './dashboard-stat-card'
import { NavigateButton } from './navigate-button'
import type { JobStatusType } from '@/components/ui/status-pill'

export async function DetailingOwnerDashboard() {
  const supabase = await createAuthClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [
    { data: paidInvoicesToday },
    { data: paidInvoicesMonth },
    { data: paidInvoicesAll },
    { count: jobsTodayCount },
    { count: jobsThisWeekCount },
    { data: todayJobs },
    { data: jobsForRebook },
    { data: paidInvoicesWithJob },
    { data: reviewsData },
    { data: paidInvoicesLast30Days },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('amount_total')
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .gte('paid_at', today.toISOString())
      .lt('paid_at', todayEnd.toISOString()),
    supabase
      .from('invoices')
      .select('amount_total')
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .gte('paid_at', monthStart.toISOString()),
    supabase
      .from('invoices')
      .select('amount_total, paid_at')
      .eq('status', 'paid')
      .not('paid_at', 'is', null),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', todayEnd.toISOString()),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_at', weekStart.toISOString()),
    supabase
      .from('jobs')
      .select('id, scheduled_at, status, address, clients(name), services(name)')
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('jobs')
      .select('customer_id, clients(name)')
      .eq('status', 'done'),
    supabase
      .from('invoices')
      .select('amount_total, job:jobs(customer_id, service:services(name))')
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .not('job_id', 'is', null),
    supabase.from('reviews').select('rating'),
    supabase
      .from('invoices')
      .select('amount_total, paid_at')
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .gte('paid_at', new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const todayRevenue = (paidInvoicesToday ?? []).reduce(
    (s, i) => s + Number(i.amount_total),
    0
  )
  const monthRevenue = (paidInvoicesMonth ?? []).reduce(
    (s, i) => s + Number(i.amount_total),
    0
  )
  const monthCount = (paidInvoicesMonth ?? []).length
  const aov = monthCount > 0 ? monthRevenue / monthCount : 0

  const customerJobCount: Record<
    string,
    { name: string; count: number; totalSpend: number }
  > = {}
  for (const row of jobsForRebook ?? []) {
    const cid = row.customer_id
    const clientsRaw = row.clients as { name: string } | { name: string }[] | null
    const client = Array.isArray(clientsRaw) ? clientsRaw[0] ?? null : clientsRaw
    if (!cid) continue
    if (!customerJobCount[cid])
      customerJobCount[cid] = { name: client?.name ?? '—', count: 0, totalSpend: 0 }
    customerJobCount[cid].count++
  }
  for (const inv of paidInvoicesWithJob ?? []) {
    const job = inv.job as { customer_id?: string } | null
    const cid = job?.customer_id
    if (cid && customerJobCount[cid])
      customerJobCount[cid].totalSpend += Number(inv.amount_total)
  }
  const allWithOnePlus = Object.entries(customerJobCount).filter(
    ([, v]) => v.count >= 1
  )
  const allWithTwoPlus = allWithOnePlus.filter(([, v]) => v.count >= 2)
  const rebookRatePct =
    allWithOnePlus.length > 0
      ? (allWithTwoPlus.length / allWithOnePlus.length) * 100
      : 0

  const rebookRows = allWithOnePlus
    .map(([id, v]) => ({
      id,
      name: v.name,
      count: v.count,
      avgSpend: v.count > 0 ? v.totalSpend / v.count : 0,
      rebookRate: v.count >= 2 ? 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const revByService: Record<string, number> = {}
  for (const inv of paidInvoicesWithJob ?? []) {
    const job = inv.job as { service?: { name: string } | null } | null
    const name = job?.service?.name ?? 'Other'
    revByService[name] = (revByService[name] ?? 0) + Number(inv.amount_total)
  }
  const revenueByService = Object.entries(revByService)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const reviewAvg =
    (reviewsData ?? []).length > 0
      ? (reviewsData as { rating: number }[]).reduce((s, r) => s + r.rating, 0) /
        (reviewsData?.length ?? 1)
      : null

  const dayBuckets: Record<string, number> = {}
  for (let d = 0; d < 14; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() - (13 - d))
    date.setHours(0, 0, 0, 0)
    dayBuckets[date.toISOString().slice(0, 10)] = 0
  }
  for (const inv of paidInvoicesLast30Days ?? []) {
    const key = (inv.paid_at as string)?.slice(0, 10)
    if (key && key in dayBuckets) dayBuckets[key] += Number(inv.amount_total)
  }
  const dailySales = Object.entries(dayBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({
      date,
      amount,
      label: new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }))

  const weekBuckets: Record<string, number> = {}
  for (let w = 0; w < 12; w++) {
    const d = new Date(today)
    d.setDate(d.getDate() - 7 * (11 - w))
    d.setHours(0, 0, 0, 0)
    const weekStartDate = new Date(d)
    weekStartDate.setDate(d.getDate() - d.getDay())
    const key = weekStartDate.toISOString().slice(0, 10)
    weekBuckets[key] = 0
  }
  for (const inv of paidInvoicesLast30Days ?? []) {
    const d = new Date((inv.paid_at as string).slice(0, 10))
    const weekStartDate = new Date(d)
    weekStartDate.setDate(d.getDate() - d.getDay())
    const key = weekStartDate.toISOString().slice(0, 10)
    if (key in weekBuckets) weekBuckets[key] += Number(inv.amount_total)
  }
  const weeklySales = Object.entries(weekBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, amount]) => ({
      weekLabel: new Date(k).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      amount,
    }))

  const monthBuckets: Record<string, number> = {}
  for (let m = 0; m < 6; m++) {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - m), 1)
    monthBuckets[d.toISOString().slice(0, 7)] = 0
  }
  for (const inv of paidInvoicesAll ?? []) {
    const key = (inv.paid_at as string)?.slice(0, 7)
    if (key && key in monthBuckets)
      monthBuckets[key] += Number((inv as { amount_total: number }).amount_total)
  }
  const monthlySales = Object.entries(monthBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, amount]) => ({
      monthLabel: new Date(k + '-01').toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
      amount,
    }))

  const statCards = [
    {
      label: "Today's Revenue",
      value: `$${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      iconName: 'DollarSign' as const,
    },
    {
      label: 'Jobs Today',
      value: jobsTodayCount ?? 0,
      iconName: 'ClipboardList' as const,
    },
    {
      label: 'Jobs This Week',
      value: jobsThisWeekCount ?? 0,
      iconName: 'TrendingUp' as const,
    },
    {
      label: 'Average Order Value',
      value: monthCount === 0 ? '—' : `$${aov.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      iconName: 'DollarSign' as const,
    },
    {
      label: 'Rebook Rate',
      value: `${rebookRatePct.toFixed(0)}%`,
      iconName: 'Users' as const,
    },
    {
      label: 'Review Score Average',
      value: reviewAvg != null ? reviewAvg.toFixed(1) : '—',
      iconName: 'Star' as const,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <h1 className="page-title text-white">Dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <DashboardStatCard
            key={card.label}
            iconName={card.iconName}
            label={card.label}
            value={card.value}
          />
        ))}
      </section>

      <DashboardCharts
        dailySales={dailySales}
        weeklySales={weeklySales}
        monthlySales={monthlySales}
        revenueByService={revenueByService}
        rebookRows={rebookRows}
      />

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="section-label">
            {today.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </h2>
          <Link
            href={crmPath('/jobs')}
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent)]/80 shrink-0"
          >
            All jobs →
          </Link>
        </div>
        {todayJobs && todayJobs.length > 0 ? (
          <ul className="space-y-2">
            {todayJobs.map(
              (job: {
                id: string
                scheduled_at: string
                status: string
                address: string
                clients: { name: string } | { name: string }[] | null
                services: { name: string } | { name: string }[] | null
              }) => {
                const client = Array.isArray(job.clients)
                  ? job.clients[0]
                  : job.clients
                const service = Array.isArray(job.services)
                  ? job.services[0]
                  : job.services
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`
                return (
                  <li key={job.id}>
                    <Card className="transition-all duration-200 hover:translate-y-[-2px]">
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <Link href={crmPath(`/jobs/${job.id}`)} className="flex items-center gap-4 min-w-0 flex-1">
                          <span className="text-sm tabular-nums text-[var(--text-muted)] w-14 shrink-0">
                            {new Date(job.scheduled_at).toLocaleTimeString(
                              'en-US',
                              { hour: 'numeric', minute: '2-digit' }
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">
                              {client?.name ?? '—'}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)] truncate">
                              {service?.name ?? 'Service'} · {job.address}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusPill
                            status={job.status as JobStatusType}
                            type="job"
                          />
                          <NavigateButton href={directionsUrl} />
                        </div>
                      </div>
                    </Card>
                  </li>
                )
              }
            )}
          </ul>
        ) : (
          <EmptyState
            iconName="ClipboardList"
            headline="No jobs today"
            subtext="Jobs scheduled for today will appear here."
            ctaLabel="View schedule"
            ctaHref={crmPath('/schedule')}
          />
        )}
      </section>

      <DetailingQuickActions />
    </div>
  )
}
