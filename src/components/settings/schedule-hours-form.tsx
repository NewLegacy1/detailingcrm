'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function hourLabel(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

function endHourLabel(h: number): string {
  if (h === 24) return '12 AM (midnight)'
  return hourLabel(h)
}

export function ScheduleHoursForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [start, setStart] = useState(9)
  const [end, setEnd] = useState(18)
  const [travelBufferMins, setTravelBufferMins] = useState(20)

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.service_hours_start === 'number') setStart(data.service_hours_start)
        if (data && typeof data.service_hours_end === 'number') setEnd(data.service_hours_end)
        if (data && typeof data.travel_buffer_minutes === 'number') setTravelBufferMins(data.travel_buffer_minutes)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (start >= end) {
      setMessage({ type: 'error', text: 'Start must be before end.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_hours_start: start,
          service_hours_end: end,
          travel_buffer_minutes: travelBufferMins,
        }),
      })
      if (res.ok) setMessage({ type: 'success', text: 'Saved. Calendar and booking page use these settings.' })
      else setMessage({ type: 'error', text: (await res.json()).error || 'Failed to save' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-[var(--text-muted)] text-sm">Loading…</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-6 space-y-4 max-w-md">
        <h2 className="section-title text-[var(--text)]">Service hours &amp; booking</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Service hours define when the calendar shows and when clients can book. Travel buffer is the gap between jobs so no overlapping or back-to-back bookings.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service-hours-start">From</Label>
            <select
              id="service-hours-start"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] text-sm"
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{hourLabel(i)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-hours-end">To</Label>
            <select
              id="service-hours-end"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] text-sm"
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i + 1}>{endHourLabel(i + 1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="travel-buffer-minutes">Travel buffer between jobs (minutes)</Label>
          <input
            id="travel-buffer-minutes"
            type="number"
            min={0}
            max={120}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] text-sm"
            value={travelBufferMins}
            onChange={(e) => setTravelBufferMins(Math.max(0, Math.min(120, parseInt(e.target.value, 10) || 0)))}
          />
          <p className="text-xs text-[var(--text-muted)]">No new booking can start until this many minutes after the previous job ends (default 20).</p>
        </div>
        {message && (
          <p className={message.type === 'success' ? 'text-emerald-600 text-sm' : 'text-red-500 text-sm'}>
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={saving || start >= end}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
