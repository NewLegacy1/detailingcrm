'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { JobDetailPopup } from '@/components/job-detail-popup'
import { ScheduleJobDetailModal, type JobFull } from '../schedule/schedule-job-detail-modal'
import { JobsDayView } from './jobs-day-view'
import { JobsDayPanel } from './jobs-day-panel'
import { JobsTable } from './jobs-table'
import { MobileJobsList } from './mobile-jobs-list'
import { useIsMobile } from '@/hooks/use-media-query'
import { Calendar } from 'lucide-react'

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
  dayStats: { total: number; completed: number; revenue: number; avgValue: number }
  listJobs: JobRow[]
  datesWithJobs: string[]
  crew: { id: string; display_name: string | null; jobCount: number }[]
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
      {isMobile ? (
        <MobileJobsList
          listJobs={listJobs}
          timeZone={timeZone}
          todayStr={todayStr}
          onSelectJob={(job) => setSelectedJobId(job.id)}
        />
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
                jobs={dayJobs}
                date={date}
                stats={dayStats}
                onSelectJob={(job) => setSelectedJobId(job.id)}
              />
            </div>
          </div>
          <aside className="hidden lg:block w-[300px] shrink-0 border-l overflow-y-auto relative" style={{ borderColor: 'var(--border)' }}>
            <JobsDayPanel date={date} datesWithJobs={datesWithJobs} crew={crew} />
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
                  background: 'linear-gradient(to top, rgba(0,184,245,0.07) 0%, rgba(0,184,245,0.04) 45%, transparent 100%), var(--surface-1)',
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
                <JobsDayPanel date={date} datesWithJobs={datesWithJobs} crew={crew} />
              </div>
            </>
          )}
        </div>
      ) : null}
      {!isMobile && showTable && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <JobsTable initialJobs={listJobs} onSelectJob={(job) => setSelectedJobId(job.id)} />
        </div>
      )}

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
