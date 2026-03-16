'use client'

import { cn } from '@/lib/utils'

export type JobStatusType =
  | 'scheduled'
  | 'en_route'
  | 'in_progress'
  | 'done'
  | 'cancelled'
  | 'no_show'

export type InvoiceStatusType = 'draft' | 'pending' | 'sent' | 'paid' | 'void' | 'overdue'

const jobStatusConfig: Record<
  JobStatusType,
  { label: string; className: string }
> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  en_route: {
    label: 'En Route',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  done: {
    label: 'Done',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  no_show: {
    label: 'No Show',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
}

const invoiceStatusConfig: Record<
  InvoiceStatusType,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-white/10 text-gray-400 border-white/10',
  },
  pending: {
    label: 'Sent',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  void: {
    label: 'Void',
    className: 'bg-white/10 text-gray-400 border-white/10',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
}

interface StatusPillProps {
  status: JobStatusType | InvoiceStatusType
  type?: 'job' | 'invoice'
  className?: string
}

export function StatusPill({
  status,
  type = 'job',
  className,
}: StatusPillProps) {
  const config =
    type === 'invoice' && status in invoiceStatusConfig
      ? invoiceStatusConfig[status as InvoiceStatusType]
      : jobStatusConfig[status as JobStatusType] ??
        { label: String(status), className: 'bg-white/10 text-gray-400' }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
