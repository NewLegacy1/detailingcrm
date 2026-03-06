'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

type Period = 'daily' | 'weekly' | 'monthly'

interface DailyPoint {
  date: string
  amount: number
  label: string
}

interface RevenueByService {
  name: string
  amount: number
}

interface RebookRow {
  id: string
  name: string
  count: number
  avgSpend: number
  rebookRate: number
}

interface DashboardChartsProps {
  dailySales: DailyPoint[]
  weeklySales: { weekLabel: string; amount: number }[]
  monthlySales: { monthLabel: string; amount: number }[]
  revenueByService: RevenueByService[]
  rebookRows: RebookRow[]
}

export function DashboardCharts({
  dailySales,
  weeklySales,
  monthlySales,
  revenueByService,
  rebookRows,
}: DashboardChartsProps) {
  const [period, setPeriod] = useState<Period>('daily')

  const periodLabels = [
    { key: 'daily' as const, label: 'Daily' },
    { key: 'weekly' as const, label: 'Weekly' },
    { key: 'monthly' as const, label: 'Monthly' },
  ]

  const chartData =
    period === 'daily'
      ? dailySales
      : period === 'weekly'
        ? weeklySales.map((w) => ({ date: w.weekLabel, amount: w.amount, label: w.weekLabel }))
        : monthlySales.map((m) => ({ date: m.monthLabel, amount: m.amount, label: m.monthLabel }))

  const maxAmount = Math.max(1, ...chartData.map((d) => d.amount))
  const totalServiceRev = revenueByService.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card className="h-full transition-all duration-200 hover:translate-y-[-2px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-white">
              Sales
            </CardTitle>
            <div className="flex rounded-lg border border-white/10 p-0.5">
              {periodLabels.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                    period === p.key
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyState
                iconName="BarChart3"
                headline="No sales data"
                subtext="Paid invoices will appear here."
              />
            ) : (
              <div className="flex items-end gap-1 h-32">
                {chartData.map((d) => (
                  <div
                    key={d.date}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={`${d.label}: $${d.amount.toLocaleString()}`}
                  >
                    <div
                      className="w-full rounded-t bg-[var(--accent)] min-h-[4px] transition-all duration-200"
                      style={{
                        height: `${Math.max(4, (d.amount / maxAmount) * 100)}px`,
                      }}
                    />
                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-full">
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card className="h-full transition-all duration-200 hover:translate-y-[-2px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">
              Revenue by service
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByService.length === 0 ? (
              <EmptyState
                iconName="PieChart"
                headline="No revenue by service"
                subtext="Paid invoices linked to jobs will show here."
              />
            ) : (
              <ul className="space-y-2">
                {revenueByService.slice(0, 6).map((r, i) => {
                  const pct = totalServiceRev > 0 ? (r.amount / totalServiceRev) * 100 : 0
                  return (
                    <li key={r.name} className="flex items-center gap-2">
                      <span
                        className="h-2 flex-shrink-0 rounded-full w-12 bg-white/10 overflow-hidden"
                        title={`${pct.toFixed(0)}%`}
                      >
                        <span
                          className="h-full block rounded-full bg-[var(--accent)] transition-all duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="truncate text-sm text-[var(--text-secondary)] flex-1 min-w-0">
                        {r.name}
                      </span>
                      <span className="text-sm font-medium text-white shrink-0">
                        ${r.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-5">
        <Card className="transition-all duration-200 hover:translate-y-[-2px]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-white">
              Rebook rate
            </CardTitle>
            <p className="text-xs text-[var(--text-muted)]">
              Customer name, booking count, avg spend, rebook rate %
            </p>
          </CardHeader>
          <CardContent>
            {rebookRows.length === 0 ? (
              <EmptyState
                iconName="BarChart3"
                headline="No rebook data"
                subtext="Complete more jobs to see rebook rates."
              />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        <th className="pb-2 pr-4">Customer</th>
                        <th className="pb-2 pr-4">Bookings</th>
                        <th className="pb-2 pr-4">Avg spend</th>
                        <th className="pb-2">Rebook %</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--text-secondary)]">
                      {rebookRows.map((r) => (
                        <tr key={r.id} className="border-b border-white/5 last:border-0">
                          <td className="py-3 pr-4 font-medium text-white">{r.name}</td>
                          <td className="py-3 pr-4">{r.count}</td>
                          <td className="py-3 pr-4">
                            ${r.avgSpend.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3">{r.rebookRate.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2">
                  {rebookRows.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="font-medium text-white">{r.name}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-[var(--text-muted)]">
                        <span>{r.count} bookings</span>
                        <span>${r.avgSpend.toLocaleString('en-US', { maximumFractionDigits: 2 })} avg</span>
                        <span>{r.rebookRate.toFixed(0)}% rebook</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
