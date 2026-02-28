import Link from 'next/link'

type JobStatus = 'scheduled' | 'en_route' | 'in_progress' | 'done' | 'cancelled' | 'no_show'

interface JobCardProps {
  id: string
  scheduled_at: string
  status: JobStatus
  address: string
  clientName: string
  vehicleSummary: string
  serviceName: string
  price: number
  /** When set, link goes to /jobs?date=...&job=id so the jobs page opens with this job in the popup */
  date?: string
}

function getStatusStyle(status: JobStatus): React.CSSProperties {
  const base = { padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500 }
  if (status === 'scheduled')
    return { ...base, background: 'rgba(0,184,245,0.1)', border: '1px solid #00b8f5', color: '#eef2ff' }
  if (status === 'in_progress' || status === 'en_route')
    return { ...base, background: 'rgba(245,158,11,0.1)', border: '1px solid #fbbf24', color: '#eef2ff' }
  if (status === 'done')
    return { ...base, background: 'rgba(34,197,94,0.1)', border: '1px solid #4ade80', color: '#eef2ff' }
  return { ...base, background: 'var(--surface-4)', border: '1px solid var(--border)', color: 'var(--text-2)' }
}

/** User-facing status label for dashboard/job cards */
function getStatusLabel(status: JobStatus): string {
  if (status === 'scheduled' || status === 'en_route') return 'Pending'
  if (status === 'in_progress') return 'In Progress'
  if (status === 'done') return 'Done'
  return status.replace('_', ' ')
}

export function JobCard({
  id,
  scheduled_at,
  status,
  address,
  clientName,
  vehicleSummary,
  serviceName,
  price,
  date,
}: JobCardProps) {
  const timeStr = new Date(scheduled_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  const [time, period] = timeStr.split(' ')
  const isInProgress = status === 'in_progress'
  const href = date ? `/jobs?date=${encodeURIComponent(date)}&job=${encodeURIComponent(id)}` : `/jobs/${id}`

  return (
    <Link
      href={href}
      className="rounded-[10px] no-underline text-inherit border min-h-[44px] md:min-h-0"
      style={{
        background: isInProgress ? 'rgba(0,184,245,0.03)' : 'var(--surface-2)',
        borderColor: isInProgress ? 'rgba(0,184,245,0.2)' : 'var(--border)',
      }}
    >
      {/* Desktop: original single-row 5-column layout */}
      <div
        className="hidden md:grid gap-3 items-center py-[11px] px-[14px]"
        style={{ gridTemplateColumns: '38px 1fr auto auto auto' }}
      >
        <div
          className="font-mono text-sm"
          style={{ color: 'var(--text-1)' }}
        >
          {time}
          <br />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{period}</span>
        </div>
        <div>
          <div className="font-semibold mb-0.5" style={{ color: 'var(--text-1)' }}>{clientName}</div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            {vehicleSummary}
            {address ? ` · ${address}` : ''}
          </div>
        </div>
        <span
          className="text-xs rounded-md px-2 py-1"
          style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}
        >
          {serviceName}
        </span>
        <div className="font-mono font-bold" style={{ color: 'var(--text-1)' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)}
        </div>
        <span style={getStatusStyle(status)}>{getStatusLabel(status)}</span>
      </div>
      {/* Mobile: customer name, time, service, status pill */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1.5 items-center py-3 px-4 md:hidden">
        <div className="font-mono text-sm text-[var(--text-1)]">
          {time}
          <span className="text-[11px] text-[var(--text-3)] ml-0.5">{period}</span>
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[var(--text-1)] truncate">{clientName}</div>
          <div className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
            {serviceName}
            {(vehicleSummary || address) ? ` · ${[vehicleSummary, address].filter(Boolean).join(' ')}` : ''}
          </div>
        </div>
        <span style={getStatusStyle(status)} className="shrink-0">
          {getStatusLabel(status)}
        </span>
      </div>
    </Link>
  )
}
