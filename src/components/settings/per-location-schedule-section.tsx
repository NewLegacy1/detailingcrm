'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Location } from '@/types/locations'

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

export function PerLocationScheduleSection() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Location[]) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || locations.length < 2) return null

  return (
    <section>
      <h2 className="section-title text-[var(--text)] mb-1">Per-location schedule</h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        When you have multiple locations, each has its own service hours and booking slot interval. Edit below or in Settings → Locations.
      </p>
      <div className="space-y-6">
        {locations.map((loc) => (
          <LocationScheduleCard key={loc.id} location={loc} onSaved={() => {}} />
        ))}
      </div>
    </section>
  )
}

function LocationScheduleCard({ location, onSaved }: { location: Location; onSaved: () => void }) {
  const [start, setStart] = useState(location.hours_start ?? 9)
  const [end, setEnd] = useState(location.hours_end ?? 18)
  const [slotMins, setSlotMins] = useState(location.slot_interval_minutes ?? 30)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setStart(location.hours_start ?? 9)
    setEnd(location.hours_end ?? 18)
    setSlotMins(location.slot_interval_minutes ?? 30)
  }, [location.id, location.hours_start, location.hours_end, location.slot_interval_minutes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (start >= end) {
      setMessage({ type: 'error', text: 'Start must be before end.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours_start: start,
          hours_end: end,
          slot_interval_minutes: Math.max(5, Math.min(120, slotMins)),
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Saved.' })
        onSaved()
      } else {
        const data = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: (data as { error?: string }).error || 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4 max-w-md">
      <h3 className="font-medium text-[var(--text)]">{location.name}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`hours-start-${location.id}`}>From</Label>
          <select
            id={`hours-start-${location.id}`}
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
          <Label htmlFor={`hours-end-${location.id}`}>To</Label>
          <select
            id={`hours-end-${location.id}`}
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
        <Label htmlFor={`slot-${location.id}`}>Booking slot interval (minutes)</Label>
        <input
          id={`slot-${location.id}`}
          type="number"
          min={5}
          max={120}
          step={5}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] text-sm"
          value={slotMins}
          onChange={(e) => setSlotMins(Math.max(5, Math.min(120, parseInt(e.target.value, 10) || 30)))}
        />
      </div>
      {message && (
        <p className={message.type === 'success' ? 'text-emerald-600 text-sm' : 'text-red-500 text-sm'}>
          {message.text}
        </p>
      )}
      <Button type="submit" disabled={saving || start >= end}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
