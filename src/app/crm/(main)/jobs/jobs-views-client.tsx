'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { JobDetailPopup } from '@/components/job-detail-popup'
import { ScheduleJobDetailModal, type JobFull } from '../schedule/schedule-job-detail-modal'
import { JobsDayView } from './jobs-day-view'
import { JobsDayPanel } from './jobs-day-panel'
import { JobsTable } from './jobs-table'
import { JobsNewJobButton } from './jobs-new-job-button'
import { MobileJobsList } from './mobile-jobs-list'
import { useIsMobile } from '@/hooks/use-media-query'
import { Calendar, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string
  notes?: string | null
  paid_at?: string | null
  assigned_tech_id?: string | null
  vehicle_id?: string | null
  service_id?: string | null
  clients: { id: string; name: string } | { id: string; name: string }[] | null
  vehicles?: { id: string; make: string; model: string; year: number | null; color?: string | null } | { id: string; make: string; model: string; year: number | null; color?: string | null }[] | null
  services?: { id: string; name: string; base_price?: number } | { id: string; name: string; base_price?: number }[] | null
}

interface JobsViewsClientProps {
  showDayView: boolean
  showTable: boolean
  dayJobs: JobRow[]
  date: string
  dayStats: { total: number; completed: number; revenue: number; avgValue: number; expectedTotal?: number }
  listJobs: JobRow[]
  datesWithJobs: string[]
  crew: { id: string; display_name: string | null; jobCount: number }[]
  activityItems: { id: string; title: string; subtitle: string; dotColor: string }[]
  /** When set (e.g. from ?job=id), open the job detail popup on load */
  initialJobId?: string
  timeZone?: string
  todayStr?: string
}

export function JobsViewsClient({
  showDayView,
  showTable,
  dayJobs,
  date,
  dayStats,
  listJobs,
  datesWithJobs,
  crew,
  activityItems = [],
  initialJobId,
  timeZone = 'America/Toronto',
  todayStr = new Date().toISOString().slice(0, 10),
}: JobsViewsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId ?? null)
  const [editJobId, setEditJobId] = useState<string | null>(null)
  const [editJobData, setEditJobData] = useState<JobFull | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [dayPanelOpen, setDayPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  function matchJob(job: JobRow, q: string): boolean {
    if (!q.trim()) return true
    const term = q.trim().toLowerCase()
    const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
    const vehicle = Array.isArray(job.vehicles) ? job.vehicles[0] : job.vehicles
    const service = Array.isArray(job.services) ? job.services[0] : job.services
    const name = (client?.name ?? '').toLowerCase()
    const vehicleStr = vehicle
      ? `${vehicle.year ?? ''} ${vehicle.make} ${vehicle.model}`.toLowerCase()
      : ''
    const serviceName = (service?.name ?? '').toLowerCase()
    const address = (job.address ?? '').toLowerCase()
    const notes = (job.notes ?? '').toLowerCase()
    const status = (job.status ?? '').replace(/_/g, ' ')
    const statusLabel = job.status === 'done' && job.paid_at ? 'completed and paid' : status.toLowerCase()
    return (
      name.includes(term) ||
      vehicleStr.includes(term) ||
      serviceName.includes(term) ||
      address.includes(term) ||
      notes.includes(term) ||
      statusLabel.includes(term)
    )
  }

  const filteredDayJobs = useMemo(
    () => (searchQuery.trim() ? dayJobs.filter((j) => matchJob(j, searchQuery)) : dayJobs),
    [dayJobs, searchQuery]
  )
  const filteredListJobs = useMemo(
    () => (searchQuery.trim() ? listJobs.filter((j) => matchJob(j, searchQuery)) : listJobs),
    [listJobs, searchQuery]
  )

  const filteredDayStats = useMemo(() => {
    if (!searchQuery.trim() || filteredDayJobs.length === dayJobs.length) return dayStats
    const completed = filteredDayJobs.filter((j) => j.status === 'done').length
    let revenue = 0
    for (const j of filteredDayJobs) {
      const base = (j as JobRow & { base_price?: number; size_price_offset?: number; job_upsells?: { price: number }[] }).base_price ?? 0
      const size = (j as JobRow & { size_price_offset?: number }).size_price_offset ?? 0
      const upsells = (j as JobRow & { job_upsells?: { price: number }[] }).job_upsells ?? []
      revenue += base + size + (upsells.reduce((s, u) => s + u.price, 0) || 0)
    }
    const total = filteredDayJobs.length
    return {
      total,
      completed,
      revenue,
      avgValue: total > 0 ? Math.round(revenue / total) : 0,
    }
  }, [dayStats, filteredDayJobs, dayJobs.length, searchQuery])

  useEffect(() => {
    if (initialJobId?.trim()) setSelectedJobId(initialJobId.trim())
  }, [initialJobId])

  const handleDeleted = () => {
    setSelectedJobId(null)
    clearJobFromUrl()
    router.refresh()
  }

  function clearJobFromUrl() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('job')
    const q = params.toString()
    router.replace(q ? crmPath(`/jobs?${q}`) : crmPath('/jobs'))
  }

  const handleClose = () => {
    setSelectedJobId(null)
    clearJobFromUrl()
    router.refresh()
  }

  return (
    <>
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          <Input
            type="search"
            placeholder="Search jobs (customer, vehicle, service, address…)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-lg w-full"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-1)' }}
          />
        </div>
        <JobsNewJobButton />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      {isMobile ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MobileJobsList
            listJobs={filteredListJobs}
            timeZone={timeZone}
            todayStr={todayStr}
            onSelectJob={(job) => setSelectedJobId(job.id)}
          />
        </div>
      ) : showDayView ? (
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div
              className="lg:hidden shrink-0 flex items-center justify-end px-4 py-2 border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
            >
              <button
                type="button"
                onClick={() => setDayPanelOpen(true)}
                className="flex items-center gap-2 min-h-[44px] px-4 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }}
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-w-0">
              <JobsDayView
                jobs={filteredDayJobs}
                date={date}
                stats={searchQuery.trim() ? filteredDayStats : dayStats}
                onSelectJob={(job) => setSelectedJobId(job.id)}
              />
            </div>
          </div>
          <aside className="hidden lg:block w-[300px] shrink-0 border-l overflow-y-auto relative" style={{ borderColor: 'var(--border)' }}>
            <JobsDayPanel date={date} datesWithJobs={datesWithJobs} crew={crew} activityItems={activityItems} />
          </aside>
          {dayPanelOpen && (
            <>
              <div
                className="fixed inset-0 z-40 lg:hidden"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                onClick={() => setDayPanelOpen(false)}
                aria-hidden
              />
              <div
                className="fixed right-0 top-0 bottom-0 z-50 w-[300px] max-w-[100vw] overflow-y-auto lg:hidden"
                style={{
                  background: 'var(--surface-1)',
                  borderLeft: '1px solid var(--border)',
                }}
              >
                <div className="sticky top-0 flex items-center justify-between p-3 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-1)' }}>Calendar</span>
                  <button
                    type="button"
                    onClick={() => setDayPanelOpen(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}
                    aria-label="Close calendar"
                  >
                    ×
                  </button>
                </div>
                <JobsDayPanel date={date} datesWithJobs={datesWithJobs} crew={crew} activityItems={activityItems} />
              </div>
            </>
          )}
        </div>
      ) : null}
      {!isMobile && showTable && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <JobsTable initialJobs={filteredListJobs} onSelectJob={(job) => setSelectedJobId(job.id)} />
        </div>
      )}
      </div>

      <JobDetailPopup
        open={!!selectedJobId}
        jobId={selectedJobId}
        onClose={handleClose}
        onDeleted={handleDeleted}
        onOpenEdit={(id, jobData) => {
          setSelectedJobId(null)
          setEditJobId(id)
          setEditJobData(jobData ?? null)
          setEditModalOpen(true)
        }}
      />

      <ScheduleJobDetailModal
        open={editModalOpen}
        jobId={editJobId}
        onClose={() => { setEditModalOpen(false); setEditJobId(null); setEditJobData(null) }}
        onSaved={() => { setEditModalOpen(false); setEditJobId(null); setEditJobData(null); router.refresh() }}
        initialJobData={editJobData}
      />
    </>
  )
}
