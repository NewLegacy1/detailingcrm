'use client'

import { useState } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { StatCard } from '@/app/crm/(main)/dashboard/stat-card'
import { ReportsExportButton } from './reports-export-button'
import { ReportsRevenueBar } from './reports-revenue-bar'
import { ReportsChartsClient } from './reports-charts-client'
import { Tag } from 'lucide-react'

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export interface PromoStatRow {
  id: string
  name: string
  code: string
  used_count: number
  total_discount_amount: number
  usage_limit: number | null
  uses_per_customer: number | null
  is_active: boolean
}

interface ReportsTabsClientProps {
  activeTab: 'overview' | 'promo-codes'
  isPro: boolean
  chartData: { date: string; revenue: number }[]
  totalRevenue: number
  jobCount: number
  avgValue: number
  rebookCount: number
  revenueByServiceBar: { label: string; value: number }[]
  topServicesBar: { label: string; value: number }[]
  rebookRows: { id: string; name: string; count: number }[]
  dailySalesForExport: [string, number][]
  revByServiceList: [string, number][]
  topServices: [string, number][]
  promoStats: PromoStatRow[]
}

export function ReportsTabsClient({
  activeTab,
  isPro,
  chartData,
  totalRevenue,
  jobCount,
  avgValue,
  rebookCount,
  revenueByServiceBar,
  topServicesBar,
  rebookRows,
  dailySalesForExport,
  revByServiceList,
  topServices,
  promoStats,
}: ReportsTabsClientProps) {
  const [tab, setTab] = useState<'overview' | 'promo-codes'>(activeTab)

  const promoBarData = promoStats
    .slice(0, 10)
    .map((p) => ({ label: p.code, value: p.used_count }))
    .filter((d) => d.value > 0)

  const totalPromoUses = promoStats.reduce((s, p) => s + (p.used_count ?? 0), 0)
  const totalPromoDiscount = promoStats.reduce((s, p) => s + Number(p.total_discount_amount || 0), 0)

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold hidden md:block" style={{ color: 'var(--text-1)' }}>Reports</h1>
          {isPro && (
            <Link href={crmPath('/reports/locations')} className="text-sm text-[var(--accent)] hover:underline">
              By location
            </Link>
          )}
          <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'overview' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setTab('promo-codes')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${tab === 'promo-codes' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'}`}
            >
              <Tag className="h-3.5 w-3.5" />
              Promo codes
            </button>
          </div>
        </div>
        {tab === 'overview' && (
          <ReportsExportButton
            dailySales={dailySalesForExport}
            revByServiceList={revByServiceList}
            topServices={topServices}
            rebookRows={rebookRows}
          />
        )}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Revenue (last 30 days)" value={currency(totalRevenue)} />
            <StatCard label="Jobs (last 30 days)" value={jobCount} />
            <StatCard label="Avg. job value" value={currency(avgValue)} />
            <StatCard label="Returning clients" value={rebookCount} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-2)' }}>Revenue (last 30 days)</h2>
              <ReportsChartsClient chartData={chartData} />
            </div>
            <div className="rounded-2xl border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-2)' }}>Revenue by service</h2>
              {revenueByServiceBar.length > 0 ? (
                <ReportsRevenueBar data={revenueByServiceBar} valueLabel="Revenue" />
              ) : (
                <p className="text-sm py-8" style={{ color: 'var(--text-3)' }}>No payment data by service yet.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-2)' }}>Top services (job count)</h2>
              {topServicesBar.length > 0 ? (
                <ReportsRevenueBar data={topServicesBar} valueLabel="Jobs" />
              ) : (
                <p className="text-sm py-8" style={{ color: 'var(--text-3)' }}>No jobs in this period.</p>
              )}
            </div>
            <div className="rounded-2xl border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-2)' }}>Returning clients (rebook)</h2>
              {rebookRows.length > 0 ? (
                <ul className="space-y-2">
                  {rebookRows.slice(0, 15).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{r.name}</span>
                      <span className="font-mono text-sm" style={{ color: 'var(--text-2)' }}>{r.count} jobs</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm py-8" style={{ color: 'var(--text-3)' }}>No returning clients in this period.</p>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'promo-codes' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total promo uses" value={totalPromoUses} />
            <StatCard label="Total discount given" value={currency(totalPromoDiscount)} />
            <StatCard label="Active codes" value={promoStats.filter((p) => p.is_active).length} />
            <StatCard label="Codes with uses" value={promoStats.filter((p) => (p.used_count ?? 0) > 0).length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-2)' }}>Uses by promo code</h2>
              {promoBarData.length > 0 ? (
                <ReportsRevenueBar data={promoBarData} valueLabel="Uses" />
              ) : (
                <p className="text-sm py-8" style={{ color: 'var(--text-3)' }}>
                  No promo code usage yet. <Link href={crmPath('/promo-codes')} className="text-[var(--accent)] hover:underline">Create codes</Link> in Marketing → Promo codes.
                </p>
              )}
            </div>
            <div className="rounded-2xl border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>All promo codes</h2>
                <Link href={crmPath('/promo-codes')} className="text-sm text-[var(--accent)] hover:underline">Manage</Link>
              </div>
              {promoStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
                        <th className="text-left py-2 pr-4 font-medium">Name</th>
                        <th className="text-left py-2 pr-4 font-medium">Code</th>
                        <th className="text-right py-2 pr-4 font-medium">Uses</th>
                        <th className="text-right py-2 font-medium">Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoStats.map((p) => (
                        <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-2 pr-4" style={{ color: 'var(--text-1)' }}>{p.name}</td>
                          <td className="py-2 pr-4 font-mono" style={{ color: 'var(--text-2)' }}>{p.code}</td>
                          <td className="py-2 pr-4 text-right font-mono" style={{ color: 'var(--text-2)' }}>{p.used_count}</td>
                          <td className="py-2 text-right" style={{ color: 'var(--text-2)' }}>{currency(Number(p.total_discount_amount || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm py-8" style={{ color: 'var(--text-3)' }}>
                  No promo codes yet. <Link href={crmPath('/promo-codes')} className="text-[var(--accent)] hover:underline">Create them</Link> in Marketing → Promo codes.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
