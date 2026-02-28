'use client'

import Link from 'next/link'

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string
  clients: { id: string; name: string } | { id: string; name: string }[] | null
  vehicles: { id: string; make: string; model: string; year: number | null } | { id: string; make: string; model: string; year: number | null }[] | null
  services: { id: string; name: string } | { id: string; name: string }[] | null
}

interface JobsKanbanProps {
  jobs: JobRow[]
  /** When provided, card click opens the job popup instead of navigating */
  onSelectJob?: (job: JobRow) => void
}

const COLUMNS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
] as const

export function JobsKanban({ jobs, onSelectJob }: JobsKanbanProps) {
  const byStatus = COLUMNS.map((col) => ({
    ...col,
    jobs: jobs.filter((j) => j.status === col.key),
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {byStatus.map((col) => (
        <div key={col.key} className="flex flex-col min-h-0">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 sticky top-0 py-1 bg-[var(--bg)]">
            {col.label}
            <span className="ml-2 text-[var(--text-muted)]/80">({col.jobs.length})</span>
          </h3>
          <div className="space-y-2 overflow-y-auto">
            {col.jobs.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4">None</p>
            ) : (
              col.jobs.map((job) => {
                const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
                const service = Array.isArray(job.services) ? job.services[0] : job.services
                const vehicle = job.vehicles && (Array.isArray(job.vehicles) ? job.vehicles[0] : job.vehicles)
                const cardContent = (
                  <>
                    <p className="font-medium text-[var(--text)] text-sm">{client?.name ?? '—'}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{service?.name ?? 'Service'}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {new Date(job.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {vehicle && ` · ${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`}
                    </p>
                  </>
                )
                const cardClassName = 'block p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]/30 transition-colors text-left w-full'
                return (
                  <div key={job.id}>
                    {onSelectJob ? (
                      <button
                        type="button"
                        className={cardClassName}
                        onClick={() => onSelectJob(job)}
                      >
                        {cardContent}
                      </button>
                    ) : (
                      <Link href={`/jobs/${job.id}`} className={cardClassName}>
                        {cardContent}
                      </Link>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
