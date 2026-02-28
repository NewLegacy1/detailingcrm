'use client'

import type { BookingSuccessData } from './BookingPageClient'

interface BookingRouteSummaryProps {
  bookSuccess: BookingSuccessData | null
  businessName?: string
  onClose?: () => void
}

export function BookingRouteSummary({ bookSuccess, businessName, onClose }: BookingRouteSummaryProps) {
  if (!bookSuccess) return null

  const dateStr = bookSuccess.scheduledAt
    ? (() => {
        try {
          const d = new Date(bookSuccess.scheduledAt)
          return d.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        } catch {
          return bookSuccess.scheduledAt
        }
      })()
    : null

  const handleCalendar = () => {
    if (!bookSuccess.scheduledAt) return
    try {
      const start = new Date(bookSuccess.scheduledAt)
      const end = new Date(start.getTime() + 60 * 60 * 1000)
      const fmt = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `${bookSuccess.serviceName} — ${businessName ?? 'Booking'}`,
        dates: `${fmt(start)}/${fmt(end)}`,
        details: `Booked via ${businessName ?? 'our booking page'}`,
        location: bookSuccess.address,
      })
      window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank')
    } catch (_) {}
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--booking-bg, #212121)' }}
    >
      {/* animated checkmark */}
      <div className="mb-8 flex items-center justify-center">
        <svg
          viewBox="0 0 80 80"
          className="h-24 w-24"
          style={{ filter: 'drop-shadow(0 0 24px var(--accent, #22c55e))' }}
        >
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke="var(--accent, #22c55e)"
            strokeWidth="4"
            strokeDasharray="226"
            strokeDashoffset="0"
            style={{ animation: 'booking-ring 0.6s ease forwards' }}
          />
          <polyline
            points="24,42 35,53 56,30"
            fill="none"
            stroke="var(--accent, #22c55e)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            strokeDashoffset="60"
            style={{ animation: 'booking-check 0.4s 0.5s ease forwards' }}
          />
        </svg>
      </div>

      <h1
        className="text-3xl font-bold text-center mb-2"
        style={{ color: 'var(--text, #eef2ff)' }}
      >
        You&apos;re booked!
      </h1>
      <p
        className="text-lg text-center mb-8"
        style={{ color: 'var(--text-secondary, #7e8da8)' }}
      >
        {businessName ? `${businessName} will see you then.` : 'See you then!'}
      </p>

      {/* Booking summary card */}
      <div
        className="w-full max-w-sm rounded-2xl border p-5 mb-8 space-y-3"
        style={{
          background: 'var(--booking-surface, rgba(255,255,255,0.05))',
          borderColor: 'var(--border, rgba(255,255,255,0.1))',
        }}
      >
        {bookSuccess.serviceName && (
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--text-muted, #3d4d65)' }} className="text-sm">Service</span>
            <span style={{ color: 'var(--text, #eef2ff)' }} className="text-sm font-medium text-right">{bookSuccess.serviceName}</span>
          </div>
        )}
        {dateStr && (
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--text-muted, #3d4d65)' }} className="text-sm">When</span>
            <span style={{ color: 'var(--text, #eef2ff)' }} className="text-sm font-medium text-right">{dateStr}</span>
          </div>
        )}
        {bookSuccess.address && (
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--text-muted, #3d4d65)' }} className="text-sm">Address</span>
            <span style={{ color: 'var(--text, #eef2ff)' }} className="text-sm font-medium text-right max-w-[200px]">{bookSuccess.address}</span>
          </div>
        )}
        {bookSuccess.customerName && (
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--text-muted, #3d4d65)' }} className="text-sm">Name</span>
            <span style={{ color: 'var(--text, #eef2ff)' }} className="text-sm font-medium">{bookSuccess.customerName}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={handleCalendar}
          className="flex-1 rounded-xl py-3 px-4 text-sm font-medium border transition-colors hover:opacity-90"
          style={{
            borderColor: 'var(--accent, #22c55e)',
            color: 'var(--accent, #22c55e)',
            background: 'transparent',
          }}
        >
          Add to Calendar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl py-3 px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ background: 'var(--accent, #22c55e)' }}
        >
          Back to Home
        </button>
      </div>

      <style>{`
        @keyframes booking-ring {
          from { stroke-dashoffset: 226; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes booking-check {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
