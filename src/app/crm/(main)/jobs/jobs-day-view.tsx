'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string
  notes?: string | null
  paid_at?: string | null
  assigned_tech_id?: string | null
  base_price?: number
  size_price_offset?: number
  job_upsells?: { price: number }[]
  clients: { id: string; name: string } | { id: string; name: string }[] | null
  vehicles?:
    | { id: string; make: string; model: string; year: number | null; color?: string | null }
    | { id: string; make: string; model: string; year: number | null; color?: string | null }[]
    | null
  services?:
    | { id: string; name: string; base_price?: number }
    | { id: string; name: string; base_price?: number }[]
    | null
}

interface JobsDayViewProps {
  jobs: JobRow[]
  date: string
  stats: { total: number; completed: number; revenue: number; avgValue: number; expectedTotal?: number }
  /** When provided, clicking a job opens the popup instead of navigating to full page */
  onSelectJob?: (job: JobRow) => void
}

function formatDateForParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Ensure scheduled_at parses as UTC (Supabase may return "2026-02-26 16:02:00+00"; ISO with T and Z is unambiguous). */
function parseScheduledAt(s: string | null | undefined): string {
  if (!s) return new Date().toISOString()
  if (s.includes('T') || s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return s
  return s.replace(' ', 'T').replace(/\+00$/, 'Z')
}

function getStatusStyles(status: string): React.CSSProperties {
  const s = (status ?? '').toLowerCase()
  if (s === 'scheduled' || s === 'en_route')
    return { background: 'rgba(0,184,245,0.1)', color: '#00b8f5', border: '1px solid rgba(0,184,245,0.18)' }
  if (s === 'in_progress')
    return { background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.18)' }
  if (s === 'done')
    return { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.18)' }
  if (s === 'cancelled' || s === 'no_show')
    return { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }
  return { background: 'rgba(0,184,245,0.1)', color: '#00b8f5', border: '1px solid rgba(0,184,245,0.18)' }
}

function getStatusLabel(status: string, paidAt?: string | null): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'in_progress') return 'In Progress'
  if (s === 'en_route') return 'En Route'
  if (s === 'no_show') return 'No Show'
  if (s === 'done') return paidAt ? 'Completed and paid' : 'Completed'
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Scheduled'
}

export function JobsDayView({ jobs, date, stats, onSelectJob }: JobsDayViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = new Date(date + 'T12:00:00')
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isToday = date === todayKey

  function go(days: number) {
    const next = new Date(current)
    next.setDate(next.getDate() + days)
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', formatDateForParam(next))
    router.push(crmPath(`/jobs?${params.toString()}`))
  }

  const dateLabel = current.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Split by local time (getHours() is in user's timezone) so morning/afternoon match what they see
  const morningJobs = jobs.filter((j) => new Date(parseScheduledAt(j.scheduled_at)).getHours() < 12)
  const afternoonJobs = jobs.filter((j) => new Date(parseScheduledAt(j.scheduled_at)).getHours() >= 12)

  const remaining = stats.total - stats.completed

  if (jobs.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => go(-1)}
            className="flex items-center justify-center transition-colors rounded-[7px] border hover:border-[var(--border-hi)] hover:text-[var(--text-1)]"
            style={{ width: 28, height: 28, borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="text-[0.875rem] font-semibold tracking-tight" style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{dateLabel}</span>
          {isToday && (
            <span
              className="font-mono rounded"
              style={{ fontSize: '0.7rem', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 7px', border: '1px solid rgba(0,184,245,0.2)', borderRadius: 4 }}
            >
              Today
            </span>
          )}
          <button
            type="button"
            onClick={() => go(1)}
            className="flex items-center justify-center transition-colors rounded-[7px] border hover:border-[var(--border-hi)] hover:text-[var(--text-1)]"
            style={{ width: 28, height: 28, borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div
          className="flex flex-col items-center justify-center text-center rounded-xl border max-h-[200px] py-8 px-6"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-center rounded-[10px] border shrink-0 mb-3"
            style={{ width: 40, height: 40, background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}
          >
            <ClipboardList className="h-5 w-5" />
          </div>
          <h3 className="text-[0.875rem] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>No jobs this day</h3>
          <p className="text-[0.75rem] mb-3" style={{ color: 'var(--text-3)' }}>Jobs scheduled for {dateLabel} will appear here.</p>
          <p className="text-[0.7rem] max-w-[260px]" style={{ color: 'var(--text-3)' }}>
            Use the <strong>calendar on the right</strong> to pick another day or year. If you see jobs on Schedule, open that same date here (same day + year).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Date nav */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => go(-1)}
          className="flex items-center justify-center transition-colors rounded-[7px] border hover:border-[var(--border-hi)] hover:text-[var(--text-1)] shrink-0"
          style={{ width: 28, height: 28, borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="text-[0.875rem] font-semibold tracking-tight" style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{dateLabel}</span>
        {isToday && (
          <span
            className="font-mono rounded"
            style={{ fontSize: '0.7rem', color: 'var(--blue)', background: 'var(--blue-dim)', padding: '2px 7px', border: '1px solid rgba(0,184,245,0.2)', borderRadius: 4 }}
          >
            Today
          </span>
        )}
        <button
          type="button"
          onClick={() => go(1)}
          className="flex items-center justify-center transition-colors rounded-[7px] border hover:border-[var(--border-hi)] hover:text-[var(--text-1)] shrink-0"
          style={{ width: 28, height: 28, borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <div className="rounded-[10px] border border-white/6 bg-[var(--surface-1)] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="text-[0.7rem] font-semibold text-[#4a5568] uppercase tracking-wider mb-2">
            Today&apos;s Jobs
          </div>
          <div className="text-[1.6rem] font-bold text-white tracking-tight font-mono leading-none mb-1">
            {stats.total}
          </div>
          <div className="text-[0.7rem] text-[#4a5568]">{remaining} remaining today</div>
        </div>
        <div className="rounded-[10px] border border-white/6 bg-[var(--surface-1)] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="text-[0.7rem] font-semibold text-[#4a5568] uppercase tracking-wider mb-2">
            Revenue
          </div>
          <div className="text-[1.6rem] font-bold text-white tracking-tight font-mono leading-none mb-1">
            ${stats.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[0.7rem] text-[#4a5568]">Paid today</div>
        </div>
        <div className="rounded-[10px] border border-white/6 bg-[var(--surface-1)] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="text-[0.7rem] font-semibold text-[#4a5568] uppercase tracking-wider mb-2">
            Completed
          </div>
          <div className="text-[1.6rem] font-bold text-white tracking-tight font-mono leading-none mb-1">
            {stats.completed}
          </div>
          <div className="text-[0.7rem] text-[#4a5568]">{remaining} remaining today</div>
        </div>
        <div className="rounded-[10px] border border-white/6 bg-[var(--surface-1)] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="text-[0.7rem] font-semibold text-[#4a5568] uppercase tracking-wider mb-2">
            Expected
          </div>
          <div className="text-[1.6rem] font-bold text-white tracking-tight font-mono leading-none mb-1">
            ${(stats.expectedTotal ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[0.7rem] text-[#4a5568]">Base + size + add-ons</div>
        </div>
        <div className="rounded-[10px] border border-white/6 bg-[var(--surface-1)] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="text-[0.7rem] font-semibold text-[#4a5568] uppercase tracking-wider mb-2">
            Avg. Job Value
          </div>
          <div className="text-[1.6rem] font-bold text-white tracking-tight font-mono leading-none mb-1">
            ${stats.avgValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[0.7rem] text-[#4a5568]">From paid invoices</div>
        </div>
      </div>

      {/* Job cards */}
      <JobSection label="Morning" jobs={morningJobs} onSelectJob={onSelectJob} />
      <JobSection label="Afternoon" jobs={afternoonJobs} className="mt-4" onSelectJob={onSelectJob} />
    </div>
  )
}

function JobSection({
  label,
  jobs,
  className = '',
  onSelectJob,
}: {
  label: string
  jobs: JobRow[]
  className?: string
  onSelectJob?: (job: JobRow) => void
}) {
  if (jobs.length === 0) return null
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="uppercase"
          style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em' }}
        >
          {label}
        </span>
        <span style={{ fontSize: '0.67rem', color: 'var(--text-3)' }}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}
        </span>
      </div>
      <ul className="flex flex-col gap-2 mb-6">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onSelectJob={onSelectJob} />
        ))}
      </ul>
    </div>
  )
}

function JobCard({ job, onSelectJob }: { job: JobRow; onSelectJob?: (job: JobRow) => void }) {
  const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
  const service = Array.isArray(job.services) ? job.services[0] : job.services
  const vehicle = job.vehicles
    ? Array.isArray(job.vehicles)
      ? job.vehicles[0]
      : job.vehicles
    : null
  const vehicleStr = vehicle
    ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}${vehicle.color ? ` · ${vehicle.color}` : ''}`
    : ''
  const time = new Date(parseScheduledAt(job.scheduled_at))
  const hour = time.getHours()
  const minute = time.getMinutes()
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  const timeStr = `${hour12}:${String(minute).padStart(2, '0')}`
  const jobBase = typeof job.base_price === 'number' ? job.base_price : (service?.base_price ?? 0)
  const sizeOffset = typeof job.size_price_offset === 'number' ? job.size_price_offset : 0
  const upsellsArr = Array.isArray(job.job_upsells) ? job.job_upsells : []
  const upsellTotal = upsellsArr.reduce((s, u) => s + Number(u.price), 0)
  const price = jobBase + sizeOffset + upsellTotal
  const isInProgress = job.status === 'in_progress'
  const statusLabel = getStatusLabel(job.status, job.paid_at)
  const statusStyles = getStatusStyles(job.status)

  const cardClassName = 'cursor-pointer transition-colors rounded-[9px] border hover:border-[var(--border-hi)] hover:bg-[var(--surface-2)]'
  const cardStyle = {
    padding: '11px 14px',
    background: isInProgress ? 'rgba(0,184,245,0.03)' : 'var(--surface-1)',
    borderColor: isInProgress ? 'rgba(0,184,245,0.2)' : 'var(--border)',
  } as React.CSSProperties
  const contentDesktop = (
    <>
      <div className="flex flex-col font-mono">
        <span className="leading-none" style={{ fontSize: '0.72rem', color: 'var(--text-1)' }}>{timeStr}</span>
        <span className="mt-0.5" style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{ampm}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate mb-0.5" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>
          {client?.name ?? '—'}
        </div>
        <div className="flex items-center gap-1.5 truncate" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
          {vehicleStr && <span>{vehicleStr}</span>}
          {vehicleStr && <span className="shrink-0 w-0.5 h-0.5 rounded-full" style={{ background: 'var(--text-3)' }} />}
          <span className="truncate">{job.address}</span>
        </div>
      </div>
      <span
        className="font-semibold whitespace-nowrap rounded"
        style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
      >
        {service?.name ?? 'Service'}
      </span>
      <span
        className="font-mono font-bold whitespace-nowrap"
        style={{ fontSize: '0.82rem', color: 'var(--text-1)' }}
      >
        ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </span>
      <div
        className="flex items-center gap-1.5 font-semibold whitespace-nowrap rounded-[5px]"
        style={{ fontSize: '0.65rem', padding: '3px 8px', ...statusStyles }}
      >
        <span className="rounded-full shrink-0" style={{ width: 5, height: 5, background: 'currentColor' }} aria-hidden />
        {statusLabel}
      </div>
    </>
  )
  const contentMobile = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex flex-col font-mono shrink-0">
          <span className="leading-none" style={{ fontSize: '0.72rem', color: 'var(--text-1)' }}>{timeStr}</span>
          <span className="mt-0.5" style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{ampm}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate mb-0.5" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>
            {client?.name ?? '—'}
          </div>
          <div className="flex items-center gap-1.5 truncate" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
            {vehicleStr && <span>{vehicleStr}</span>}
            {vehicleStr && <span className="shrink-0 w-0.5 h-0.5 rounded-full" style={{ background: 'var(--text-3)' }} />}
            <span className="truncate">{job.address}</span>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 font-semibold whitespace-nowrap rounded-[5px] shrink-0"
          style={{ fontSize: '0.65rem', padding: '3px 8px', ...statusStyles }}
        >
          <span className="rounded-full shrink-0" style={{ width: 5, height: 5, background: 'currentColor' }} aria-hidden />
          {statusLabel}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-1 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <span
          className="font-semibold whitespace-nowrap rounded"
          style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
        >
          {service?.name ?? 'Service'}
        </span>
        <span
          className="font-mono font-bold whitespace-nowrap"
          style={{ fontSize: '0.82rem', color: 'var(--text-1)' }}
        >
          ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      </div>
    </>
  )

  return (
    <li>
      {onSelectJob ? (
        <button
          type="button"
          className={cardClassName}
          style={cardStyle}
          onClick={() => onSelectJob(job)}
        >
          <div className="hidden md:grid gap-3 items-center" style={{ gridTemplateColumns: '38px 1fr auto auto auto' }}>
            {contentDesktop}
          </div>
          <div className="md:hidden">
            {contentMobile}
          </div>
        </button>
      ) : (
        <Link href={crmPath(`/jobs/${job.id}`)} className={cardClassName} style={cardStyle}>
          <div className="hidden md:grid gap-3 items-center" style={{ gridTemplateColumns: '38px 1fr auto auto auto' }}>
            {contentDesktop}
          </div>
          <div className="md:hidden">
            {contentMobile}
          </div>
        </Link>
      )}
    </li>
  )
}
