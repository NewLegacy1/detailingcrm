'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/St_Johns',
  'America/Mexico_City',
  'America/Tijuana',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
]

function formatTimezoneLabel(tz: string): string {
  const parts = tz.replace(/_/g, ' ').split('/')
  return parts.length >= 2 ? `${parts[0]} / ${parts.slice(1).join(' ')}` : tz
}

export function TimezoneForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [timezone, setTimezone] = useState('America/Toronto')

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.timezone && typeof data.timezone === 'string') {
          setTimezone(data.timezone)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      })
      if (res.ok) setMessage({ type: 'success', text: 'Timezone saved.' })
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
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] text-sm"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {(() => {
              const options = [...COMMON_TIMEZONES]
              if (timezone && !options.includes(timezone)) {
                options.unshift(timezone)
              }
              return options.map((tz) => (
                <option key={tz} value={tz}>
                  {formatTimezoneLabel(tz)}
                </option>
              ))
            })()}
          </select>
        </div>
        {message && (
          <p className={message.type === 'success' ? 'text-emerald-600 text-sm' : 'text-red-500 text-sm'}>
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
