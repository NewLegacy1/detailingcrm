'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Loader2, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GoogleStatus {
  connected: boolean
  calendarId: string | null
  calendarName: string | null
  options: {
    syncToCompany: boolean
    syncToEmployee: boolean
    moveOnReassign: boolean
  }
}

interface CalendarEntry {
  id: string
  summary: string
  primary?: boolean
}

export function GoogleCalendarCard() {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calendars, setCalendars] = useState<CalendarEntry[]>([])
  const [calendarsLoading, setCalendarsLoading] = useState(false)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [options, setOptions] = useState({ syncToCompany: true, syncToEmployee: false, moveOnReassign: true })
  const [optionsSaving, setOptionsSaving] = useState(false)

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/integrations/google/status')
    const data = res.ok ? await res.json() : { connected: false, calendarId: null, calendarName: null, options: {} }
    setStatus(data)
    if (data.options) setOptions((o) => ({ ...o, ...data.options }))
    return data
  }, [])

  useEffect(() => {
    fetchStatus().then((data) => {
      if (data?.connected && !data?.calendarId) {
        setShowCalendarPicker(true)
        loadCalendars()
      }
    }).finally(() => setLoading(false))
  }, [fetchStatus])

  async function handleConnect() {
    setActionLoading('connect')
    setError(null)
    try {
      const res = await fetch('/api/integrations/google/connect', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || 'Failed to connect')
    } catch {
      setError('Request failed')
    }
    setActionLoading(null)
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google Calendar? Jobs will no longer sync to Google.')) return
    setActionLoading('disconnect')
    try {
      await fetch('/api/integrations/google/disconnect', { method: 'POST' })
      setStatus((s) => (s ? { ...s, connected: false, calendarId: null, calendarName: null } : null))
      setShowCalendarPicker(false)
    } finally {
      setActionLoading(null)
    }
  }

  async function loadCalendars() {
    setCalendarsLoading(true)
    try {
      const res = await fetch('/api/integrations/google/calendars')
      if (res.ok) {
        const list = await res.json()
        setCalendars(Array.isArray(list) ? list : [])
      }
    } finally {
      setCalendarsLoading(false)
    }
  }

  function openCalendarPicker() {
    setShowCalendarPicker(true)
    if (status?.connected) loadCalendars()
  }

  async function selectCalendar(calendarId: string) {
    setActionLoading('select')
    try {
      const res = await fetch('/api/integrations/google/calendars/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId }),
      })
      if (res.ok) {
        const entry = calendars.find((c) => c.id === calendarId)
        setStatus((s) => (s ? { ...s, calendarId, calendarName: entry?.summary ?? null } : null))
        setShowCalendarPicker(false)
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function createDetailingCalendar() {
    setActionLoading('create')
    try {
      const res = await fetch('/api/integrations/google/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: 'Detailing Jobs' }),
      })
      const data = res.ok ? await res.json() : null
      if (data?.id) {
        setStatus((s) => (s ? { ...s, calendarId: data.id, calendarName: data.summary ?? 'Detailing Jobs' } : null))
        setShowCalendarPicker(false)
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function saveOptions() {
    setOptionsSaving(true)
    try {
      const res = await fetch('/api/integrations/google/options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })
      if (res.ok) setStatus((s) => (s ? { ...s, options } : null))
    } finally {
      setOptionsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        <span className="text-[var(--text-muted)]">Loading Google Calendar status…</span>
      </div>
    )
  }

  const connected = status?.connected ?? false
  const hasCalendar = !!(connected && status?.calendarId)

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
          <Calendar className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="section-title text-[var(--text)] flex items-center gap-2">
            Google Calendar
            {connected ? (
              <span className="text-sm font-normal text-green-500">Connected</span>
            ) : (
              <span className="text-sm font-normal text-amber-500">Not connected</span>
            )}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {connected
              ? 'Sync CRM jobs to a company calendar. CRM is the source of truth; Google events mirror your jobs.'
              : 'Connect Google Calendar to sync jobs to a single company calendar.'}
          </p>
          {connected && status?.calendarId && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Company calendar: {status.calendarName || status.calendarId}
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {!connected && (
              <Button onClick={handleConnect} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                {actionLoading === 'connect' && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect Google Calendar
              </Button>
            )}
            {connected && (
              <>
                <Button variant="outline" onClick={openCalendarPicker} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                  {actionLoading === 'select' || actionLoading === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Choose Company Calendar
                </Button>
                <Button variant="outline" onClick={handleDisconnect} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                  {actionLoading === 'disconnect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {showCalendarPicker && connected && (
        <div className="border border-[var(--border)] rounded-lg p-4 space-y-3 bg-[var(--bg)]">
          <h3 className="text-sm font-medium text-[var(--text)]">Company calendar to use</h3>
          {calendarsLoading ? (
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading calendars…</p>
          ) : (
            <>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {calendars.map((cal) => (
                  <button
                    key={cal.id}
                    type="button"
                    onClick={() => selectCalendar(cal.id)}
                    disabled={!!actionLoading}
                    className="text-left text-sm px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-white/5 text-[var(--text)]"
                  >
                    {cal.summary} {cal.primary && '(Primary)'}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={createDetailingCalendar} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                {actionLoading === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
                Create new &quot;Detailing Jobs&quot; calendar
              </Button>
            </>
          )}
        </div>
      )}

      {connected && (
        <div className="space-y-4 pt-2 border-t border-[var(--border)]">
          <h3 className="text-sm font-medium text-[var(--text)]">Sync options</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.syncToCompany}
              onChange={(e) => setOptions((o) => ({ ...o, syncToCompany: e.target.checked }))}
              className="rounded border-[var(--border)]"
            />
            <span className="text-sm text-[var(--text)]">Sync CRM jobs to Company Jobs calendar</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.syncToEmployee}
              onChange={(e) => setOptions((o) => ({ ...o, syncToEmployee: e.target.checked }))}
              className="rounded border-[var(--border)]"
            />
            <span className="text-sm text-[var(--text)]">Also sync to assigned employee calendar</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.moveOnReassign}
              onChange={(e) => setOptions((o) => ({ ...o, moveOnReassign: e.target.checked }))}
              className="rounded border-[var(--border)]"
            />
            <span className="text-sm text-[var(--text)]">If reassigned, move event to new employee</span>
          </label>
          <Button size="sm" onClick={saveOptions} disabled={optionsSaving} className="inline-flex items-center gap-2">
            {optionsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save sync options
          </Button>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-4">
        CRM is the source of truth. Google events mirror your jobs. If Google sync fails, your job is still saved.
      </p>
    </div>
  )
}
