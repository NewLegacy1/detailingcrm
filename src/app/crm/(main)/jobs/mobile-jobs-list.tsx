'use client'

import { useMemo, useState } from 'react'
import { toZonedTime } from 'date-fns-tz'
import { Search } from 'lucide-react'

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string
  notes?: string | null
  paid_at?: string | null
  base_price?: number
  size_price_offset?: number
  job_upsells?: { price: number }[]
  clients: { id: string; name: string } | { id: string; name: string }[] | null
  vehicles?: { id: string; make: string; model: string; year: number | null } | { id: string; make: string; model: string; year: number | null }[] | null
  services?: { id: string; name: string; base_price?: number } | { id: string; name: string; base_price?: number }[] | null
}

type ViewMode = 'today' | 'all'

function getJobDateKey(scheduledAt: string, timeZone: string): string {
  try {
    const d = toZonedTime(new Date(scheduledAt), timeZone)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return new Date(scheduledAt).toISOString().slice(0, 10)
  }
}

function jobMatchesSearch(job: JobRow, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
  const service = job.services ? (Array.isArray(job.services) ? job.services[0] : job.services) : null
  const clientName = (client?.name ?? '').toLowerCase()
  const serviceName = (service?.name ?? '').toLowerCase()
  const address = (job.address ?? '').toLowerCase()
  const notes = (job.notes ?? '').toLowerCase()
  const vehicle = job.vehicles ? (Array.isArray(job.vehicles) ? job.vehicles[0] : job.vehicles) : null
  const vehicleStr = vehicle ? `${vehicle.year ?? ''} ${vehicle.make} ${vehicle.model}`.toLowerCase() : ''
  return (
    clientName.includes(q) ||
    serviceName.includes(q) ||
    address.includes(q) ||
    notes.includes(q) ||
    vehicleStr.includes(q)
  )
}

function getStatusStyle(status: string): React.CSSProperties {
  const s = (status ?? '').toLowerCase()
  if (s === 'scheduled' || s === 'en_route')
    return { background: 'rgba(0,184,245,0.1)', color: '#00b8f5', border: '1px solid rgba(0,184,245,0.18)' }
  if (s === 'in_progress')
    return { background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.18)' }
  if (s === 'done')
    return { background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.18)' }
  if (s === 'cancelled' || s === 'no_show')
    return { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }
  return { background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }
}

interface MobileJobsListProps {
  listJobs: JobRow[]
  timeZone: string
  todayStr: string
  onSelectJob: (job: JobRow) => void
}

export function MobileJobsList({ listJobs, timeZone, todayStr, onSelectJob }: MobileJobsListProps) {
  const [view, setView] = useState<ViewMode>('today')
  const [search, setSearch] = useState('')

  const { todayJobs, allJobsSorted } = useMemo(() => {
    const today: JobRow[] = []
    for (const job of listJobs) {
      const key = getJobDateKey(job.scheduled_at, timeZone)
      if (key === todayStr) today.push(job)
    }
    today.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    const all = [...listJobs].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    return { todayJobs: today, allJobsSorted: all }
  }, [listJobs, timeZone, todayStr])

  const filteredToday = useMemo(
    () => todayJobs.filter((j) => jobMatchesSearch(j, search)),
    [todayJobs, search]
  )
  const filteredAll = useMemo(
    () => allJobsSorted.filter((j) => jobMatchesSearch(j, search)),
    [allJobsSorted, search]
  )
  const jobs = view === 'today' ? filteredToday : filteredAll

  return (
    <div className="flex flex-1 flex-col min-h-0 md:hidden">
      {/* Search bar at top */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by customer, service, address…"
            className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-1)',
            }}
            aria-label="Search jobs"
          />
        </div>
      </div>

      {/* Today | View all */}
      <div
        className="flex shrink-0 gap-1 p-2 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
      >
        <button
          type="button"
          onClick={() => setView('today')}
          className="flex-1 min-h-[44px] rounded-lg text-sm font-medium transition-colors"
          style={{
            background: view === 'today' ? 'var(--surface-3)' : 'transparent',
            border: `1px solid ${view === 'today' ? 'var(--border)' : 'transparent'}`,
            color: view === 'today' ? 'var(--text-1)' : 'var(--text-3)',
          }}
        >
          Today&apos;s jobs
        </button>
        <button
          type="button"
          onClick={() => setView('all')}
          className="flex-1 min-h-[44px] rounded-lg text-sm font-medium transition-colors"
          style={{
            background: view === 'all' ? 'var(--surface-3)' : 'transparent',
            border: `1px solid ${view === 'all' ? 'var(--border)' : 'transparent'}`,
            color: view === 'all' ? 'var(--text-1)' : 'var(--text-3)',
          }}
        >
          View all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {jobs.length === 0 ? (
          <div
            className="rounded-xl border py-10 px-4 text-center text-sm"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
          >
            {search.trim()
              ? 'No jobs match your search'
              : view === 'today'
                ? 'No jobs today'
                : 'No jobs yet'}
          </div>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => {
              const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
              const vehicle = job.vehicles
                ? Array.isArray(job.vehicles) ? job.vehicles[0] : job.vehicles
                : null
              const service = job.services
                ? Array.isArray(job.services) ? job.services[0] : job.services
                : null
              const vehicleStr = vehicle
                ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`
                : ''
              const time = new Date(job.scheduled_at)
              const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const jobBase = typeof job.base_price === 'number' ? job.base_price : (service?.base_price ?? 0)
              const sizeOffset = typeof job.size_price_offset === 'number' ? job.size_price_offset : 0
              const upsellsArr = Array.isArray(job.job_upsells) ? job.job_upsells : []
              const upsellTotal = upsellsArr.reduce((s, u) => s + Number(u.price), 0)
              const price = jobBase + sizeOffset + upsellTotal
              const isToday = getJobDateKey(job.scheduled_at, timeZone) === todayStr
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => onSelectJob(job)}
                    className="w-full text-left rounded-xl border p-4 transition-colors min-h-[44px]"
                    style={{
                      background: job.status === 'in_progress' ? 'rgba(0,184,245,0.04)' : 'var(--surface-2)',
                      borderColor: job.status === 'in_progress' ? 'rgba(0,184,245,0.2)' : 'var(--border)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        {view === 'all' && !isToday ? `${dateStr} · ${timeStr}` : timeStr}
                      </span>
                      <span
                        className="shrink-0 text-xs font-semibold rounded-md px-2 py-1"
                        style={getStatusStyle(job.status)}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {client?.name ?? '—'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {service?.name ?? '—'}
                      {vehicleStr ? ` · ${vehicleStr}` : ''}
                    </div>
                    <div className="font-mono font-bold mt-2 text-sm" style={{ color: 'var(--text-1)' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
