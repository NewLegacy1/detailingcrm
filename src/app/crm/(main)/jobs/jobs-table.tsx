'use client'

import { useState } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { Button } from '@/components/ui/button'

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string
  notes?: string | null
  paid_at?: string | null
  clients: { id: string; name: string } | { id: string; name: string }[] | null
  vehicles?: { id: string; make: string; model: string; year: number | null; color?: string | null } | { id: string; make: string; model: string; year: number | null; color?: string | null }[] | null
  services?: { id: string; name: string; base_price?: number } | { id: string; name: string; base_price?: number }[] | null
}

interface JobsTableProps {
  initialJobs: JobRow[]
  /** When provided, View opens the job popup instead of navigating */
  onSelectJob?: (job: JobRow) => void
}

export function JobsTable({ initialJobs, onSelectJob }: JobsTableProps) {
  const [jobs] = useState<JobRow[]>(initialJobs)

  /** Match jobs-day-view getStatusStyles: blue scheduled/en_route, amber in_progress, green done, red cancelled/no_show */
  function statusColor(status: string) {
    const s = (status ?? '').toLowerCase()
    if (s === 'done') return 'bg-green-500/10 text-green-400 border border-green-500/20'
    if (s === 'in_progress') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    if (s === 'cancelled' || s === 'no_show') return 'bg-red-500/10 text-red-400 border border-red-500/20'
    if (s === 'scheduled' || s === 'en_route') return 'bg-[#00b8f5]/10 text-[#00b8f5] border border-[#00b8f5]/20'
    return 'bg-[#00b8f5]/10 text-[#00b8f5] border border-[#00b8f5]/20'
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-white/[0.03]">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Customer</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Vehicle</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Service</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Scheduled</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] px-4 py-3">Status</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-[var(--text-muted)] py-12 px-4">
                  No jobs yet. Create one to get started.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
                const vehicle = Array.isArray(job.vehicles) ? job.vehicles[0] : job.vehicles
                const service = Array.isArray(job.services) ? job.services[0] : job.services
                return (
                <tr key={job.id} className="border-b border-[var(--border)] hover:bg-white/[0.04]">
                  <td className="px-4 py-3 font-medium text-[var(--text)]">
                    {client?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {vehicle
                      ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{service?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {new Date(job.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(job.status)}`}>
                      {job.status === 'done' && job.paid_at ? 'Completed and paid' : job.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {onSelectJob ? (
                      <Button variant="ghost" size="sm" onClick={() => onSelectJob(job)}>
                        View
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={crmPath(`/jobs/${job.id}`)}>View</Link>
                      </Button>
                    )}
                  </td>
                </tr>
              )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {jobs.length === 0 ? (
          <div className="card p-6 text-center text-[var(--text-muted)]">
            No jobs yet. Create one to get started.
          </div>
        ) : (
          jobs.map((job) => {
            const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
            const vehicle = Array.isArray(job.vehicles) ? job.vehicles[0] : job.vehicles
            const service = Array.isArray(job.services) ? job.services[0] : job.services
            const vehicleStr = vehicle
              ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`
              : '—'
            const cardContent = (
              <>
                <div className="font-medium text-[var(--text)] mb-1">{client?.name ?? '—'}</div>
                <div className="text-sm text-[var(--text-muted)] mb-1">{vehicleStr}</div>
                <div className="text-sm text-[var(--text-muted)] mb-2">{service?.name ?? '—'}</div>
                <div className="text-xs text-[var(--text-muted)] mb-2">
                  {new Date(job.scheduled_at).toLocaleString()}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(job.status)}`}>
                    {job.status === 'done' && job.paid_at ? 'Completed and paid' : job.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-medium text-[var(--accent)]">View</span>
                </div>
              </>
            )
            const cardClassName = "card w-full text-left p-4 border border-[var(--border)] hover:bg-white/[0.04] transition-colors rounded-lg block"
            return onSelectJob ? (
              <button
                key={job.id}
                type="button"
                onClick={() => onSelectJob(job)}
                className={cardClassName}
              >
                {cardContent}
              </button>
            ) : (
              <Link key={job.id} href={crmPath(`/jobs/${job.id}`)} className={cardClassName}>
                {cardContent}
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}
