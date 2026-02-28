'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Search, Plus, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { ScheduleJobDetailModal } from './schedule-job-detail-modal'
import { JobDetailPopup } from '@/components/job-detail-popup'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateInput, DateTimeInput } from '@/components/ui/date-picker'
import { useIsMobile } from '@/hooks/use-media-query'

const SLOT_MINS = 30
const SLOT_HEIGHT_PX = 48

function formatHourLabel(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string
  notes?: string | null
  actual_started_at?: string | null
  actual_ended_at?: string | null
  google_company_event_id?: string | null
  clients: { name: string } | { name: string }[] | null
  services: { name: string; duration_mins: number } | { name: string; duration_mins: number }[] | null
}

interface GoogleEventRow {
  id: string
  summary: string
  start: string
  end: string
}

type ViewMode = 'day' | 'week' | 'month' | 'year'

interface ScheduleViewProps {
  initialJobs: JobRow[]
  /** Initial selected date (YYYY-MM-DD) from URL e.g. ?date=2026-02-20 */
  initialDate?: string | null
  /** Start hour for week grid (0-23), e.g. 9 for 9 AM */
  serviceHoursStart?: number
  /** End hour for week grid (1-24, exclusive), e.g. 18 for 6 PM */
  serviceHoursEnd?: number
  /** CRM accent colour (hex) for calendar gradient; default blue when null */
  calendarAccentColor?: string | null
}

const CALENDAR_GRADIENT_DEFAULT = 'linear-gradient(to bottom right, rgba(0, 184, 245, 0.12), rgba(0, 92, 123, 0.35))'

function getCalendarGradientBackground(accentHex: string | null | undefined): string {
  if (!accentHex?.trim()) return CALENDAR_GRADIENT_DEFAULT
  const hex = accentHex.replace(/^#/, '').trim()
  let r: number, g: number, b: number
  if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  } else if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else return CALENDAR_GRADIENT_DEFAULT
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return CALENDAR_GRADIENT_DEFAULT
  const light = `rgba(${r}, ${g}, ${b}, 0.12)`
  const darkR = Math.round(Math.max(0, Math.min(255, r * 0.4)))
  const darkG = Math.round(Math.max(0, Math.min(255, g * 0.4)))
  const darkB = Math.round(Math.max(0, Math.min(255, b * 0.4)))
  const dark = `rgba(${darkR}, ${darkG}, ${darkB}, 0.35)`
  return `linear-gradient(to bottom right, ${light}, ${dark})`
}

function getRangeStartEnd(view: ViewMode, dateStr: string): { start: Date; end: Date } {
  const d = new Date(dateStr + 'T12:00:00')
  const start = new Date(d)
  const end = new Date(d)
  if (view === 'day') {
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() + 1)
  } else if (view === 'week') {
    const day = start.getDay()
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 7)
  } else if (view === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(start.getMonth() + 1)
    end.setDate(1)
    end.setHours(0, 0, 0, 0)
  } else {
    start.setMonth(0)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setFullYear(start.getFullYear() + 1)
    end.setMonth(0)
    end.setDate(1)
    end.setHours(0, 0, 0, 0)
  }
  return { start, end }
}

function getJobDisplayStartEnd(job: JobRow): { start: Date; end: Date } {
  const service = Array.isArray(job.services) ? job.services[0] : job.services
  const durationMins = service?.duration_mins ?? 60
  if (job.actual_started_at && job.actual_ended_at) {
    return { start: new Date(job.actual_started_at), end: new Date(job.actual_ended_at) }
  }
  if (job.actual_started_at) {
    const start = new Date(job.actual_started_at)
    const end = new Date(start.getTime() + durationMins * 60 * 1000)
    return { start, end }
  }
  const start = new Date(job.scheduled_at)
  const end = new Date(start.getTime() + durationMins * 60 * 1000)
  return { start, end }
}

function getStatusColor(status: string): string {
  const s = (status ?? '').toLowerCase().replace(/\s+/g, '_')
  if (s === 'done') return 'bg-emerald-500/35 text-white border-emerald-400/60 backdrop-blur-sm'
  if (s === 'in_progress') return 'bg-amber-500/35 text-white border-amber-400/60 backdrop-blur-sm'
  if (s === 'en_route') return 'bg-blue-500/35 text-white border-blue-400/60 backdrop-blur-sm'
  if (s === 'cancelled' || s === 'no_show') return 'bg-red-500/35 text-white border-red-400/60 backdrop-blur-sm'
  return 'bg-blue-500/35 text-white border-blue-400/60 backdrop-blur-sm' // scheduled
}

const STATUS_LEGEND = [
  { label: 'Scheduled', color: 'bg-blue-500 border-blue-500' },
  { label: 'In progress', color: 'bg-amber-500 border-amber-500' },
  { label: 'Done', color: 'bg-emerald-500 border-emerald-500' },
  { label: 'Cancelled', color: 'bg-red-500 border-red-500' },
] as const

function getMonthDays(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const last = new Date(year, month + 1, 0)
  const daysInMonth = last.getDate()
  const rows: (Date | null)[][] = []
  let row: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) row.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(new Date(year, month, d))
    if (row.length === 7) {
      rows.push(row)
      row = []
    }
  }
  if (row.length) {
    while (row.length < 7) row.push(null)
    rows.push(row)
  }
  return rows
}

export function ScheduleView({ initialJobs, initialDate, serviceHoursStart = 9, serviceHoursEnd = 18, calendarAccentColor }: ScheduleViewProps) {
  const calendarGradient = getCalendarGradientBackground(calendarAccentColor)
  const [view, setView] = useState<ViewMode>('week')
  const todayStr = new Date().toISOString().slice(0, 10)
  const validInitial = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && !Number.isNaN(new Date(initialDate + 'T12:00:00').getTime()) ? initialDate : null
  const [date, setDate] = useState(() => validInitial ?? todayStr)
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs)
  useEffect(() => {
    if (validInitial) setDate(validInitial)
  }, [validInitial])
  const hourStart = Math.max(0, Math.min(23, serviceHoursStart))
  const hourEnd = Math.max(hourStart + 1, Math.min(24, serviceHoursEnd))
  const totalSlots = ((hourEnd - hourStart) * 60) / SLOT_MINS
  const [search, setSearch] = useState('')
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; calendarName: string | null } | null>(null)
  const [rescheduleModal, setRescheduleModal] = useState<{ job: JobRow; newStart: Date } | null>(null)
  const [sendSmsReschedule, setSendSmsReschedule] = useState(true)
  const [sendEmailReschedule, setSendEmailReschedule] = useState(true)
  const [editTimeModal, setEditTimeModal] = useState<{ job: JobRow; start: string; end: string } | null>(null)
  const [saving, setSaving] = useState(false)
  type MovedConfirm = { type: 'job'; job: JobRow; newStart: Date; newEnd: Date } | { type: 'google'; googleEventId: string; summary: string; newStart: Date; newEnd: Date }
  const [movedConfirm, setMovedConfirm] = useState<MovedConfirm | null>(null)
  const [movedEdit, setMovedEdit] = useState<{ start: string; end: string; summary?: string; notes?: string } | null>(null)
  const [sendNotifyAfterMove, setSendNotifyAfterMove] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editJobId, setEditJobId] = useState<string | null>(null)

  function toDatetimeLocal(d: Date): string {
    const t = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    return t.toISOString().slice(0, 16)
  }

  useEffect(() => {
    if (rescheduleModal) {
      setSendSmsReschedule(true)
      setSendEmailReschedule(true)
    }
  }, [rescheduleModal])

  useEffect(() => {
    if (!movedConfirm) {
      setMovedEdit(null)
      return
    }
    setMovedEdit({
      start: toDatetimeLocal(movedConfirm.newStart),
      end: toDatetimeLocal(movedConfirm.newEnd),
      ...(movedConfirm.type === 'google' ? { summary: movedConfirm.summary } : {}),
      ...(movedConfirm.type === 'job' ? { notes: movedConfirm.job.notes ?? '' } : {}),
    })
  }, [movedConfirm])

  const { start: rangeStart, end: rangeEnd } = useMemo(() => getRangeStartEnd(view, date), [view, date])

  const fetchJobs = useCallback(() => {
    const supabase = createClient()
    const bufferStart = new Date(rangeStart)
    bufferStart.setDate(bufferStart.getDate() - 1)
    const bufferEnd = new Date(rangeEnd)
    bufferEnd.setDate(bufferEnd.getDate() + 1)
    supabase
      .from('jobs')
      .select('id, scheduled_at, status, address, notes, actual_started_at, actual_ended_at, google_company_event_id, clients(name), services(name, duration_mins)')
      .gte('scheduled_at', bufferStart.toISOString())
      .lt('scheduled_at', bufferEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setJobs(data ?? [])
      })
  }, [rangeStart.toISOString(), rangeEnd.toISOString()])

  const [googleEvents, setGoogleEvents] = useState<GoogleEventRow[]>([])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    fetch('/api/integrations/google/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setGoogleStatus({ connected: !!data.connected, calendarName: data.calendarName || data.calendarId || null })
        } else {
          setGoogleStatus({ connected: false, calendarName: null })
        }
      })
      .catch(() => setGoogleStatus({ connected: false, calendarName: null }))
  }, [])

  const fetchGoogleEvents = useCallback(() => {
    if (!googleStatus?.connected) return
    const bufferStart = new Date(rangeStart)
    bufferStart.setDate(bufferStart.getDate() - 1)
    const bufferEnd = new Date(rangeEnd)
    bufferEnd.setDate(bufferEnd.getDate() + 1)
    const timeMin = bufferStart.toISOString()
    const timeMax = bufferEnd.toISOString()
    fetch(`/api/integrations/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data: { events?: GoogleEventRow[] }) => setGoogleEvents(data.events ?? []))
      .catch(() => setGoogleEvents([]))
  }, [googleStatus?.connected, rangeStart.toISOString(), rangeEnd.toISOString()])

  useEffect(() => {
    if (!googleStatus?.connected) {
      setGoogleEvents([])
      return
    }
    fetchGoogleEvents()
  }, [googleStatus?.connected, fetchGoogleEvents])

  useEffect(() => {
    const onFocus = () => fetchJobs()
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', onFocus)
      return () => document.removeEventListener('visibilitychange', onFocus)
    }
  }, [fetchJobs])

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs
    const q = search.trim().toLowerCase()
    return jobs.filter((job) => {
      const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
      const service = Array.isArray(job.services) ? job.services[0] : job.services
      return (client?.name?.toLowerCase().includes(q) ?? false) || (service?.name?.toLowerCase().includes(q) ?? false)
    })
  }, [jobs, search])

  const goPrev = () => {
    const d = new Date(date + 'T12:00:00')
    if (view === 'day') d.setDate(d.getDate() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else if (view === 'month') d.setMonth(d.getMonth() - 1)
    else d.setFullYear(d.getFullYear() - 1)
    setDate(d.toISOString().slice(0, 10))
  }
  const goNext = () => {
    const d = new Date(date + 'T12:00:00')
    if (view === 'day') d.setDate(d.getDate() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else if (view === 'month') d.setMonth(d.getMonth() + 1)
    else d.setFullYear(d.getFullYear() + 1)
    setDate(d.toISOString().slice(0, 10))
  }
  const goToday = () => setDate(new Date().toISOString().slice(0, 10))

  const weekDays = useMemo(() => {
    const arr: Date[] = []
    const s = new Date(rangeStart)
    for (let i = 0; i < 7; i++) {
      arr.push(new Date(s))
      s.setDate(s.getDate() + 1)
    }
    return arr
  }, [rangeStart])

  const timeSlots = useMemo(() => {
    const arr: string[] = []
    for (let h = hourStart; h < hourEnd; h++) {
      for (let m = 0; m < 60; m += SLOT_MINS) {
        arr.push(`${h}:${String(m).padStart(2, '0')}`)
      }
    }
    return arr
  }, [hourStart, hourEnd])

  const jobsByDay = useMemo(() => {
    const map = new Map<string, JobRow[]>()
    filteredJobs.forEach((job) => {
      const { start } = getJobDisplayStartEnd(job)
      const key = start.toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(job)
    })
    return map
  }, [filteredJobs])

  const jobsForWeekGrid = useMemo(() => {
    const map = new Map<string, JobRow[]>()
    weekDays.forEach((day) => {
      const key = day.toISOString().slice(0, 10)
      map.set(key, jobsByDay.get(key) ?? [])
    })
    return map
  }, [weekDays, jobsByDay])

  const syncedGoogleEventIds = useMemo(
    () => new Set(filteredJobs.map((j) => j.google_company_event_id).filter(Boolean) as string[]),
    [filteredJobs]
  )
  const externalGoogleEvents = useMemo(
    () => googleEvents.filter((e) => !syncedGoogleEventIds.has(e.id)),
    [googleEvents, syncedGoogleEventIds]
  )
  const googleEventsForWeekGrid = useMemo(() => {
    const map = new Map<string, GoogleEventRow[]>()
    weekDays.forEach((day) => {
      const key = day.toISOString().slice(0, 10)
      const onDay = externalGoogleEvents.filter((e) => new Date(e.start).toISOString().slice(0, 10) === key)
      map.set(key, onDay)
    })
    return map
  }, [weekDays, externalGoogleEvents])

  const googleEventsForDay = useMemo(
    () => externalGoogleEvents.filter((e) => new Date(e.start).toISOString().slice(0, 10) === date),
    [externalGoogleEvents, date]
  )

  function timeToSlotIndex(date: Date): number {
    const h = date.getHours() - hourStart
    const m = date.getMinutes()
    return Math.max(0, Math.floor((h * 60 + m) / SLOT_MINS))
  }

  function slotIndexToTime(dayStart: Date, slotIndex: number): Date {
    const d = new Date(dayStart)
    d.setHours(hourStart, 0, 0, 0)
    d.setMinutes(d.getMinutes() + slotIndex * SLOT_MINS)
    return d
  }

  const handleDragStartJob = (e: React.DragEvent, job: JobRow) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'job', jobId: job.id }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragStartGoogleEvent = (e: React.DragEvent, ev: GoogleEventRow) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'google', googleEventId: ev.id, start: ev.start, end: ev.end, summary: ev.summary }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleColumnDrop = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault()
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const relY = e.clientY - rect.top
    const slotIndex = Math.max(0, Math.min(totalSlots - 1, Math.floor(relY / SLOT_HEIGHT_PX)))
    handleDrop(e, dayKey, slotIndex)
  }

  const handleDrop = (e: React.DragEvent, dayKey: string, slotIndex: number) => {
    e.preventDefault()
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json') as string)
      const dayStart = new Date(dayKey + 'T00:00:00')
      const newStart = slotIndexToTime(dayStart, slotIndex)

      if (payload.type === 'google' && payload.googleEventId && payload.start && payload.end) {
        const durationMs = new Date(payload.end).getTime() - new Date(payload.start).getTime()
        const newEnd = new Date(newStart.getTime() + durationMs)
        const summary = payload.summary ?? 'Event'
        setSaving(true)
        fetch(`/api/integrations/google/events/${encodeURIComponent(payload.googleEventId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: newStart.toISOString(), end: newEnd.toISOString() }),
        })
          .then((r) => {
            if (r.ok) {
              fetchGoogleEvents()
              setMovedConfirm({ type: 'google', googleEventId: payload.googleEventId, summary, newStart, newEnd })
            } else return r.json().then((err) => Promise.reject(err?.error || 'Failed'))
          })
          .catch(() => {})
          .finally(() => setSaving(false))
        return
      }

      const job = jobs.find((j) => j.id === payload.jobId)
      if (!job) return
      setRescheduleModal({ job, newStart })
    } catch {
      // ignore
    }
  }

  const handleRescheduleConfirm = async () => {
    if (!rescheduleModal) return
    setSaving(true)
    const supabase = createClient()
    const service = Array.isArray(rescheduleModal.job.services) ? rescheduleModal.job.services[0] : rescheduleModal.job.services
    const durationMins = service?.duration_mins ?? 60
    const newStart = rescheduleModal.newStart
    const newEnd = new Date(newStart.getTime() + durationMins * 60 * 1000)
    const jobId = rescheduleModal.job.id
    try {
      await supabase
        .from('jobs')
        .update({
          scheduled_at: newStart.toISOString(),
          actual_started_at: null,
          actual_ended_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      await fetch(`/api/integrations/google/sync/job/${jobId}`, { method: 'POST' }).catch(() => {})
      if (sendSmsReschedule || sendEmailReschedule) {
        await fetch(`/api/jobs/${jobId}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reschedule',
            scheduledAt: newStart.toISOString(),
            newStart: newStart.toISOString(),
            newEnd: newEnd.toISOString(),
            sendSms: sendSmsReschedule,
            sendEmail: sendEmailReschedule,
          }),
        }).catch(() => {})
      }
    } finally {
      setRescheduleModal(null)
      setSaving(false)
      fetchJobs()
    }
  }

  const handleEditTimeSave = async () => {
    if (!editTimeModal) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('jobs')
      .update({
        actual_started_at: editTimeModal.start ? new Date(editTimeModal.start).toISOString() : null,
        actual_ended_at: editTimeModal.end ? new Date(editTimeModal.end).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editTimeModal.job.id)
    fetch(`/api/integrations/google/sync/job/${editTimeModal.job.id}`, { method: 'POST' }).catch(() => {})
    setEditTimeModal(null)
    setSaving(false)
    fetchJobs()
  }

  const openEditTime = (job: JobRow) => {
    const { start, end } = getJobDisplayStartEnd(job)
    setEditTimeModal({
      job,
      start: start.toISOString().slice(0, 16),
      end: end.toISOString().slice(0, 16),
    })
  }

  const jobsByDaySimple = useMemo(() => {
    const map = new Map<string, JobRow[]>()
    filteredJobs.forEach((job) => {
      const key = getJobDisplayStartEnd(job).start.toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(job)
    })
    return map
  }, [filteredJobs])

  const jobsByMonth = useMemo(() => {
    const map = new Map<string, JobRow[]>()
    filteredJobs.forEach((job) => {
      const d = new Date(job.scheduled_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(job)
    })
    return map
  }, [filteredJobs])

  const googleEventsByMonth = useMemo(() => {
    const map = new Map<string, GoogleEventRow[]>()
    externalGoogleEvents.forEach((ev) => {
      const d = new Date(ev.start)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return map
  }, [externalGoogleEvents])

  const monthGrid = useMemo(() => {
    const d = new Date(date + 'T12:00:00')
    return getMonthDays(d.getFullYear(), d.getMonth())
  }, [date])

  const googleEventsByDay = useMemo(() => {
    const map = new Map<string, GoogleEventRow[]>()
    monthGrid.flat().forEach((cell) => {
      if (!cell) return
      const key = cell.toISOString().slice(0, 10)
      if (map.has(key)) return
      map.set(
        key,
        externalGoogleEvents.filter((e) => new Date(e.start).toISOString().slice(0, 10) === key)
      )
    })
    return map
  }, [monthGrid, externalGoogleEvents])

  const todayKey = new Date().toISOString().slice(0, 10)
  const isMobile = useIsMobile()

  /** For mobile: week containing selected date, for day strip and week header */
  const mobileWeekDays = useMemo(() => {
    const d = new Date(date + 'T12:00:00')
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    const arr: Date[] = []
    for (let i = 0; i < 7; i++) {
      arr.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return arr
  }, [date])

  const mobileWeekStart = mobileWeekDays[0]
  const mobileWeekEnd = mobileWeekDays[6]
  const goPrevWeek = () => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    setDate(d.toISOString().slice(0, 10))
  }
  const goNextWeek = () => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + 7)
    setDate(d.toISOString().slice(0, 10))
  }

  function formatDateRange(start: Date, end: Date): string {
    const s = `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`
    const e = `${end.getMonth() + 1}/${end.getDate()}/${end.getFullYear()}`
    return `${s} – ${e}`
  }

  return (
    <div className="space-y-6">
      {isMobile ? (
        /* Mobile schedule: week header, day strip, time column + cards, FAB */
        <div className="flex flex-col gap-0 min-h-0">
          {/* Week range with chevrons */}
          <div className="flex items-center justify-center gap-2 py-3">
            <button
              type="button"
              onClick={goPrevWeek}
              className="p-2 rounded-full text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-[var(--text-1)]">
              {mobileWeekStart.toLocaleDateString('en-US', { month: 'long' })} {mobileWeekStart.getDate()} – {mobileWeekEnd.toLocaleDateString('en-US', { month: 'long' })} {mobileWeekEnd.getDate()} {mobileWeekEnd.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goNextWeek}
              className="p-2 rounded-full text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              aria-label="Next week"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {/* Day strip: S 8, M 9, ... */}
          <div className="flex items-center justify-between gap-1 px-1 pb-3">
            {mobileWeekDays.map((day) => {
              const dayKey = day.toISOString().slice(0, 10)
              const selected = dayKey === date
              const letter = day.toLocaleDateString('en-US', { weekday: 'narrow' }).slice(0, 1)
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setDate(dayKey)}
                  className={`flex flex-col items-center justify-center min-w-[36px] py-2 px-1 rounded-full text-sm font-medium transition-colors ${selected ? 'bg-[var(--surface-2)] text-[var(--text-2)]' : 'text-[var(--text-3)]'}`}
                >
                  <span>{letter}</span>
                  <span>{day.getDate()}</span>
                </button>
              )
            })}
          </div>
          {/* Time column + appointments for selected day */}
          <div className="flex-1 min-h-0 flex rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-1)]">
            <div className="w-14 shrink-0 flex flex-col border-r border-[var(--border)] py-2 pr-1 text-right text-xs text-[var(--text-3)]">
              {Array.from({ length: hourEnd - hourStart }, (_, i) => (
                <div key={i} className="h-12 flex items-start justify-end leading-tight" style={{ minHeight: 48 }}>
                  {formatHourLabel(hourStart + i)}
                </div>
              ))}
            </div>
            <div className="flex-1 relative min-w-0" style={{ minHeight: (hourEnd - hourStart) * 48 }}>
              {(jobsByDay.get(date) ?? []).map((job) => {
                const { start, end } = getJobDisplayStartEnd(job)
                const service = Array.isArray(job.services) ? job.services[0] : job.services
                const status = (job.status ?? '').toLowerCase()
                const isDone = status === 'done'
                const startHour = start.getHours() + start.getMinutes() / 60 - hourStart
                const endHour = end.getHours() + end.getMinutes() / 60 - hourStart
                const topPx = startHour * 48
                const heightPx = Math.max(56, (endHour - startHour) * 48 - 4)
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`absolute left-1 right-2 rounded-lg flex flex-col items-start justify-center p-2.5 text-left shadow-sm border overflow-hidden ${getStatusColor(job.status)}`}
                    style={{ top: topPx, height: heightPx, minHeight: 56 }}
                  >
                    <div className={`w-full min-w-0 flex flex-col items-start ${isDone ? 'pr-20' : ''}`}>
                      <span className="font-semibold text-sm leading-tight truncate w-full">{service?.name ?? 'Job'}</span>
                      <span className="text-xs mt-1 leading-tight text-white/90">
                        {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} to {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    {isDone && (
                      <span className="absolute top-2 right-2 rounded-full bg-white/20 text-white text-[10px] font-medium px-2 py-0.5 whitespace-nowrap">
                        Completed
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          {/* FAB: add job */}
          <div className="flex justify-end pt-4 pr-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border)] hover:bg-[var(--surface-3)]"
              aria-label="Add job"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>
      ) : (
        <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
        <Input
          type="text"
          placeholder="Search by customer name or job title (service)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-md text-white placeholder:text-white/50 focus:border-[var(--accent)]/50 focus:ring-[var(--accent)]/20"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-[var(--border)] p-1 bg-[var(--bg-card)]">
          {(['day', 'week', 'month', 'year'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${view === v ? 'bg-[var(--accent)] text-white' : 'text-white hover:text-[var(--accent)]'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-white hover:text-[var(--accent)] transition-colors">
            ←
          </button>
          <button type="button" onClick={goNext} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-white hover:text-[var(--accent)] transition-colors">
            →
          </button>
          <button type="button" onClick={goToday} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-white hover:text-[var(--accent)] transition-colors">
            Today
          </button>
        </div>
        {view === 'day' && (
          <DateInput
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
        {view === 'week' && (
          <span className="text-sm text-white">
            {formatDateRange(rangeStart, new Date(rangeEnd.getTime() - 1))}
          </span>
        )}
        {view === 'month' && (
          <input
            type="month"
            value={date.slice(0, 7)}
            onChange={(e) => setDate(e.target.value + '-01')}
            className="flex h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-white focus:text-[var(--accent)] focus:border-[var(--accent)]/50"
          />
        )}
        {view === 'year' && (
          <input
            type="number"
            min={2020}
            max={2030}
            value={new Date(date + 'T12:00:00').getFullYear()}
            onChange={(e) => setDate(e.target.value + '-01-01')}
            className="flex h-10 w-24 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-white focus:text-[var(--accent)] focus:border-[var(--accent)]/50"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {googleStatus?.connected && googleStatus.calendarName && (
            <div className="flex items-center gap-2 text-sm text-white">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                Synced to: <strong className="text-[var(--accent)]">{googleStatus.calendarName}</strong>
              </span>
            </div>
          )}
          {googleStatus?.connected && !googleStatus.calendarName && (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                Google connected. <Link href={crmPath('/settings/bookings')} className="text-[var(--accent)] underline hover:no-underline">Choose a calendar</Link> in Settings → Bookings to see events here.
              </span>
            </div>
          )}
          {googleStatus && !googleStatus.connected && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                <Link href={crmPath('/settings/bookings')} className="text-[var(--accent)] underline hover:no-underline">Connect Google Calendar</Link> in Settings → Bookings to see and sync events.
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
            {googleStatus?.connected && (
              <span className="text-white/50">|</span>
            )}
            {STATUS_LEGEND.map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 shrink-0 rounded-sm border ${color}`} aria-hidden />
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Create event
        </button>
      </div>

      {/* Day view: single-day time grid (same as one column of week view) */}
      {view === 'day' && (() => {
        const dayKey = date
        const dayJobs = jobsByDay.get(dayKey) ?? []
        const dayGoogleEvents = googleEventsForDay
        const isToday = dayKey === todayKey
        const dayLabel = new Date(dayKey + 'T12:00:00')
        return (
          <div
            className="overflow-hidden overflow-x-auto rounded-2xl border border-[var(--border)] shadow-lg"
            style={{ background: calendarGradient }}
          >
            <div className="flex min-w-0 md:min-w-[320px] bg-[var(--bg-card)]/40 backdrop-blur-sm">
              <div className="w-14 shrink-0 border-r border-[var(--border)] pr-1 text-right text-xs text-white bg-[var(--bg-card)]/30 flex flex-col">
                <div className="shrink-0 h-[52px] border-b border-[var(--border)]" aria-hidden />
                {Array.from({ length: hourEnd - hourStart }, (_, i) => (
                  <div key={i} style={{ height: SLOT_HEIGHT_PX * (60 / SLOT_MINS) }} className="leading-tight shrink-0">
                    {formatHourLabel(hourStart + i)}
                  </div>
                ))}
                <div className="shrink-0 relative" style={{ height: 0 }}>
                  <span className="absolute bottom-0 right-0">{formatHourLabel(hourEnd)}</span>
                </div>
              </div>
              <div
                className="flex-1 min-w-[120px] md:min-w-[200px] border-r border-[var(--border)] bg-[var(--bg-card)]/20"
              >
                <div
                  className={`sticky top-0 z-10 border-b border-[var(--border)] px-2 py-2 text-center text-xs font-medium h-[52px] flex flex-col justify-center ${isToday ? 'text-[var(--accent)]' : 'text-white'}`}
                >
                  {dayLabel.toLocaleDateString('en-US', { weekday: 'short' })}
                  <br />
                  {dayLabel.getDate()}
                </div>
                <div
                  className="relative"
                  style={{ height: totalSlots * SLOT_HEIGHT_PX }}
                  data-schedule-column
                  onDragOver={handleColumnDragOver}
                  onDrop={(e) => handleColumnDrop(e, dayKey)}
                >
                  {timeSlots.map((_, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="border-b border-[var(--border)]/50"
                      style={{ height: SLOT_HEIGHT_PX }}
                      onDragOver={handleColumnDragOver}
                      onDrop={(e) => handleDrop(e, dayKey, slotIndex)}
                    />
                  ))}
                  {dayJobs.map((job) => {
                    const { start, end } = getJobDisplayStartEnd(job)
                    const startSlot = timeToSlotIndex(start)
                    const durationSlots = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (SLOT_MINS * 60 * 1000)))
                    if (start.toISOString().slice(0, 10) !== dayKey) return null
                    const top = startSlot * SLOT_HEIGHT_PX
                    const height = durationSlots * SLOT_HEIGHT_PX - 2
                    const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
                    const service = Array.isArray(job.services) ? job.services[0] : job.services
                    return (
                      <div
                        key={job.id}
                        draggable
                        onDragStart={(e) => handleDragStartJob(e, job)}
                        className={`absolute left-0.5 right-0.5 rounded border overflow-hidden shadow-sm flex cursor-grab active:cursor-grabbing ${getStatusColor(job.status)}`}
                        style={{ top, minHeight: height }}
                        onDragOver={handleColumnDragOver}
                        onDrop={(e) => handleColumnDrop(e, dayKey)}
                        title="Drag to reschedule · Click to open"
                      >
                        <div className="shrink-0 flex items-center pl-1 border-r border-white/20 self-stretch" aria-hidden>
                          <GripVertical className="h-3.5 w-3.5 opacity-60" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedJobId(job.id); }}
                          className="p-1.5 flex-1 min-w-0 flex flex-col text-left"
                        >
                          <p className="font-medium truncate text-sm">{client?.name ?? '—'}</p>
                          <p className="text-xs opacity-90 truncate">{service?.name ?? 'Job'}</p>
                          <p className="text-xs opacity-80 mt-0.5">
                            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </button>
                      </div>
                    )
                  })}
                  {dayGoogleEvents.map((ev) => {
                    const start = new Date(ev.start)
                    const end = new Date(ev.end)
                    const startSlot = timeToSlotIndex(start)
                    const endSlot = timeToSlotIndex(end)
                    const durationSlots = Math.max(1, Math.min(endSlot - startSlot, totalSlots - startSlot))
                    const topPx = startSlot * SLOT_HEIGHT_PX
                    const heightPx = durationSlots * SLOT_HEIGHT_PX - 2
                    return (
                      <div
                        key={`g-${ev.id}`}
                        draggable
                        onDragStart={(e) => handleDragStartGoogleEvent(e, ev)}
                        className="absolute left-0.5 right-0.5 rounded border border-violet-400/60 bg-violet-500/35 text-white overflow-hidden shadow-sm flex shrink-0 backdrop-blur-sm cursor-grab active:cursor-grabbing"
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          minHeight: `${heightPx}px`,
                          maxHeight: `${heightPx}px`,
                          boxSizing: 'border-box',
                        }}
                        title={`Google Calendar · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Drag to reschedule.`}
                        onDragOver={handleColumnDragOver}
                        onDrop={(e) => handleColumnDrop(e, dayKey)}
                      >
                        <div className="shrink-0 flex items-center pl-1 border-r border-white/20 self-stretch" aria-hidden>
                          <GripVertical className="h-3.5 w-3.5 opacity-60" />
                        </div>
                        <div className="p-1.5 flex-1 flex flex-col pointer-events-none overflow-hidden min-h-0" style={{ height: '100%' }}>
                          <p className="font-medium truncate text-sm text-white">{ev.summary}</p>
                          <p className="text-xs opacity-90 text-white/80 shrink-0">
                            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Week view: time grid with faint blue gradient background */}
      {view === 'week' && (
        <div
          className="overflow-hidden overflow-x-auto rounded-2xl border border-[var(--border)] shadow-lg"
          style={{ background: calendarGradient }}
        >
          <div className="flex min-w-0 md:min-w-[800px] bg-[var(--bg-card)]/40 backdrop-blur-sm">
            <div className="w-14 shrink-0 border-r border-[var(--border)] pr-1 text-right text-xs text-white bg-[var(--bg-card)]/30 flex flex-col">
              {/* Spacer so first hour aligns under the date row, not beside it */}
              <div className="shrink-0 h-[52px] border-b border-[var(--border)]" aria-hidden />
              {Array.from({ length: hourEnd - hourStart }, (_, i) => (
                <div key={i} style={{ height: SLOT_HEIGHT_PX * (60 / SLOT_MINS) }} className="leading-tight shrink-0">
                  {formatHourLabel(hourStart + i)}
                </div>
              ))}
              <div className="shrink-0 relative" style={{ height: 0 }}>
                <span className="absolute bottom-0 right-0">{formatHourLabel(hourEnd)}</span>
              </div>
            </div>
            <div className="flex-1 flex">
              {weekDays.map((day) => {
                const dayKey = day.toISOString().slice(0, 10)
                const dayJobs = jobsForWeekGrid.get(dayKey) ?? []
                const isToday = dayKey === todayKey
                return (
                  <div
                    key={dayKey}
                    className="flex-1 min-w-[80px] md:min-w-[100px] border-r border-[var(--border)] last:border-r-0 bg-[var(--bg-card)]/20"
                  >
                    <div className={`sticky top-0 z-10 border-b border-[var(--border)] px-2 py-2 text-center text-xs font-medium h-[52px] flex flex-col justify-center ${isToday ? 'bg-[var(--accent)]/40 text-[var(--accent)]' : 'text-white bg-[var(--bg-card)]/30'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      <br />
                      {day.getDate()}
                    </div>
                    <div
                      className="relative"
                      style={{ height: totalSlots * SLOT_HEIGHT_PX }}
                      data-schedule-column
                      onDragOver={handleColumnDragOver}
                      onDrop={(e) => handleColumnDrop(e, dayKey)}
                    >
                      {timeSlots.map((_, slotIndex) => (
                        <div
                          key={slotIndex}
                          className="border-b border-[var(--border)]/50"
                          style={{ height: SLOT_HEIGHT_PX }}
                          onDragOver={handleColumnDragOver}
                          onDrop={(e) => handleDrop(e, dayKey, slotIndex)}
                        />
                      ))}
                      {dayJobs.map((job) => {
                        const { start, end } = getJobDisplayStartEnd(job)
                        const startSlot = timeToSlotIndex(start)
                        const durationSlots = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (SLOT_MINS * 60 * 1000)))
                        const dayStart = new Date(dayKey + 'T00:00:00')
                        if (start.toISOString().slice(0, 10) !== dayKey) return null
                        const top = startSlot * SLOT_HEIGHT_PX
                        const height = durationSlots * SLOT_HEIGHT_PX - 2
                        const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
                        const service = Array.isArray(job.services) ? job.services[0] : job.services
                        return (
                          <div
                            key={job.id}
                            draggable
                            onDragStart={(e) => handleDragStartJob(e, job)}
                            className={`absolute left-0.5 right-0.5 rounded border overflow-hidden shadow-sm flex cursor-grab active:cursor-grabbing ${getStatusColor(job.status)}`}
                            style={{ top, minHeight: height }}
                            onDragOver={handleColumnDragOver}
                            onDrop={(e) => handleColumnDrop(e, dayKey)}
                            title="Drag to reschedule · Click to open"
                          >
                            <div className="shrink-0 flex items-center pl-1 border-r border-white/20 self-stretch" aria-hidden>
                              <GripVertical className="h-3.5 w-3.5 opacity-60" />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedJobId(job.id); }}
                              className="p-1.5 flex-1 min-w-0 flex flex-col text-left"
                            >
                              <p className="font-medium truncate text-sm">{client?.name ?? '—'}</p>
                              <p className="text-xs opacity-90 truncate">{service?.name ?? 'Job'}</p>
                              <p className="text-xs opacity-80 mt-0.5">
                                {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </button>
                          </div>
                        )
                      })}
                      {(googleEventsForWeekGrid.get(dayKey) ?? []).map((ev) => {
                        const start = new Date(ev.start)
                        const end = new Date(ev.end)
                        const startSlot = timeToSlotIndex(start)
                        const endSlot = timeToSlotIndex(end)
                        const durationSlots = Math.max(1, Math.min(endSlot - startSlot, totalSlots - startSlot))
                        const topPx = startSlot * SLOT_HEIGHT_PX
                        const heightPx = durationSlots * SLOT_HEIGHT_PX - 2
                        return (
                          <div
                            key={`g-${ev.id}`}
                            draggable
                            onDragStart={(e) => handleDragStartGoogleEvent(e, ev)}
                            className="absolute left-0.5 right-0.5 rounded border border-violet-400/60 bg-violet-500/35 text-white overflow-hidden shadow-sm flex shrink-0 backdrop-blur-sm cursor-grab active:cursor-grabbing"
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              minHeight: `${heightPx}px`,
                              maxHeight: `${heightPx}px`,
                              boxSizing: 'border-box',
                            }}
                            title={`Google Calendar · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Drag to reschedule.`}
                            onDragOver={handleColumnDragOver}
                            onDrop={(e) => handleColumnDrop(e, dayKey)}
                          >
                            <div className="shrink-0 flex items-center pl-1 border-r border-white/20 self-stretch" aria-hidden>
                              <GripVertical className="h-3.5 w-3.5 opacity-60" />
                            </div>
                            <div className="p-1.5 flex-1 flex flex-col pointer-events-none overflow-hidden min-h-0" style={{ height: '100%' }}>
                              <p className="font-medium truncate text-sm text-white">{ev.summary}</p>
                              <p className="text-xs opacity-90 text-white/80 shrink-0">
                                {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-[var(--border)] shadow-lg" style={{ background: calendarGradient }}>
          <div className="bg-[var(--bg-card)]/40 backdrop-blur-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
              <div key={w} className="p-2 text-center text-xs font-medium text-white">
                {w}
              </div>
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {monthGrid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 min-h-[100px]">
                {row.map((cell, ci) => {
                  if (!cell) return <div key={ci} className="p-2 border-r border-[var(--border)] last:border-r-0 bg-[var(--bg)]/50" />
                  const key = cell.toISOString().slice(0, 10)
                  const dayJobs = jobsByDaySimple.get(key) ?? []
                  const dayGoogle = googleEventsByDay.get(key) ?? []
                  const client = (j: JobRow) => (Array.isArray(j.clients) ? j.clients[0] : j.clients)?.name ?? '—'
                  const service = (j: JobRow) => (Array.isArray(j.services) ? j.services[0] : j.services)?.name ?? 'Service'
                  const jobItems = dayJobs.map((job) => {
                    const { start, end } = getJobDisplayStartEnd(job)
                    const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                    return { type: 'job' as const, job, timeStr }
                  })
                  const googleItems = dayGoogle.map((ev) => {
                    const start = new Date(ev.start)
                    const end = new Date(ev.end)
                    const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                    return { type: 'google' as const, ev, timeStr }
                  })
                  const combined = [...jobItems.slice(0, 3), ...googleItems.slice(0, 2)]
                  const totalCount = dayJobs.length + dayGoogle.length
                  const showMore = totalCount > combined.length
                  const moreCount = totalCount - combined.length
                  return (
                    <div key={ci} className="p-2 border-r border-[var(--border)] last:border-r-0 flex flex-col">
                      <p className={`text-xs font-medium ${key === todayKey ? 'text-[var(--accent)]' : 'text-white'}`}>{cell.getDate()}</p>
                      <div className="flex-1 overflow-auto space-y-1 mt-1">
                        {combined.map((item) =>
                          item.type === 'job' ? (
                            <button
                              key={item.job.id}
                              type="button"
                              onClick={() => setSelectedJobId(item.job.id)}
                              className={`w-full text-left block rounded px-2 py-1 text-xs truncate border ${getStatusColor(item.job.status)}`}
                              title={item.timeStr}
                            >
                              {client(item.job)} – {service(item.job)} · {item.timeStr}
                            </button>
                          ) : (
                            <span
                              key={`g-${item.ev.id}`}
                              className="block rounded px-2 py-1 text-xs truncate border border-violet-500 bg-violet-600/90 text-white"
                              title={item.timeStr}
                            >
                              {item.ev.summary} · {item.timeStr}
                            </span>
                          )
                        )}
                        {showMore && <p className="text-xs text-white/70">+{moreCount} more</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Year view */}
      {view === 'year' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => {
            const y = new Date(date + 'T12:00:00').getFullYear()
            const key = `${y}-${String(i + 1).padStart(2, '0')}`
            const monthJobs = jobsByMonth.get(key) ?? []
            const monthGoogle = googleEventsByMonth.get(key) ?? []
            const monthName = new Date(y, i, 1).toLocaleDateString('en-US', { month: 'short' })
            const totalCount = monthJobs.length + monthGoogle.length
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setDate(`${y}-${String(i + 1).padStart(2, '0')}-01`)
                  setView('month')
                }}
                className="card p-4 text-left text-white hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors"
              >
                <p className="font-medium">
                  {monthName} {y}
                </p>
                <p className="text-sm text-white/80 mt-1">
                  {totalCount} event{totalCount !== 1 ? 's' : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}

      </>
      )}

      {/* Reschedule confirm modal: new details + SMS/email checkboxes before changing anything */}
      <Dialog open={!!rescheduleModal} onOpenChange={(open) => !open && setRescheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setRescheduleModal(null)} />
          <DialogHeader>
            <DialogTitle>Confirm reschedule</DialogTitle>
          </DialogHeader>
          {rescheduleModal && (() => {
            const { job, newStart } = rescheduleModal
            const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
            const svc = Array.isArray(job.services) ? job.services[0] : job.services
            const durationMins = svc?.duration_mins ?? 60
            const newEnd = new Date(newStart.getTime() + durationMins * 60 * 1000)
            const oldStart = new Date(job.scheduled_at)
            const oldEnd = new Date(oldStart.getTime() + durationMins * 60 * 1000)
            const fmt = (d: Date) => d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
            return (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text)]">{client?.name ?? 'Customer'}</span>
                  {svc?.name && <span> · {svc.name}</span>}
                </p>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 space-y-2 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)]">Current: </span>
                    <span className="text-[var(--text)]">{fmt(oldStart)} – {oldEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">New time: </span>
                    <span className="text-[var(--text)] font-medium">{fmt(newStart)} – {newEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">This will update the job in the calendar, Jobs page, Dashboard, and Google Calendar.</p>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendSmsReschedule}
                      onChange={(e) => setSendSmsReschedule(e.target.checked)}
                      className="rounded border-[var(--border)]"
                    />
                    <span className="text-sm text-[var(--text)]">Send SMS update to client</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailReschedule}
                      onChange={(e) => setSendEmailReschedule(e.target.checked)}
                      className="rounded border-[var(--border)]"
                    />
                    <span className="text-sm text-[var(--text)]">Send email update to client</span>
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleRescheduleConfirm} disabled={saving}>
                    {saving ? 'Updating…' : 'Confirm'}
                  </Button>
                  <Button variant="outline" onClick={() => setRescheduleModal(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Event moved – edit time/details, then optional notification */}
      <Dialog open={!!movedConfirm} onOpenChange={(open) => !open && setMovedConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setMovedConfirm(null)} />
          <DialogHeader>
            <DialogTitle>Event moved</DialogTitle>
          </DialogHeader>
          {movedConfirm && movedEdit && (
            <div className="space-y-4">
              {movedConfirm.type === 'job' && (() => {
                const client = Array.isArray(movedConfirm.job.clients) ? movedConfirm.job.clients[0] : movedConfirm.job.clients
                const service = Array.isArray(movedConfirm.job.services) ? movedConfirm.job.services[0] : movedConfirm.job.services
                return (
                  <p className="text-sm text-[var(--text-muted)]">
                    {client?.name ?? '—'} · {service?.name ?? 'Job'}
                  </p>
                )
              })()}
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs">Start</Label>
                  <DateTimeInput
                    value={movedEdit.start}
                    onChange={(e) => {
                      const startVal = e.target.value
                      if (!movedEdit) return
                      if (movedConfirm.type === 'job') {
                        const service = Array.isArray(movedConfirm.job.services) ? movedConfirm.job.services[0] : movedConfirm.job.services
                        const durationMins = service?.duration_mins ?? 60
                        const endDate = new Date(new Date(startVal).getTime() + durationMins * 60 * 1000)
                        setMovedEdit({ ...movedEdit, start: startVal, end: toDatetimeLocal(endDate) })
                      } else {
                        setMovedEdit({ ...movedEdit, start: startVal })
                      }
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <DateTimeInput
                    value={movedEdit.end}
                    onChange={(e) => setMovedEdit((prev) => (prev ? { ...prev, end: e.target.value } : null))}
                    className="mt-1"
                    disabled={movedConfirm.type === 'job'}
                    title={movedConfirm.type === 'job' ? 'End is based on start + service duration' : undefined}
                  />
                </div>
                {movedConfirm.type === 'google' && (
                  <div>
                    <Label className="text-xs">Event title</Label>
                    <Input
                      type="text"
                      value={movedEdit.summary ?? ''}
                      onChange={(e) => setMovedEdit((prev) => (prev ? { ...prev, summary: e.target.value } : null))}
                      className="mt-1"
                      placeholder="Event name"
                    />
                  </div>
                )}
                {movedConfirm.type === 'job' && (
                  <div>
                    <Label className="text-xs">Notes</Label>
                    <textarea
                      value={movedEdit.notes ?? ''}
                      onChange={(e) => setMovedEdit((prev) => (prev ? { ...prev, notes: e.target.value } : null))}
                      className="mt-1 w-full min-h-[80px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                      placeholder="Optional notes"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async () => {
                    if (!movedConfirm || !movedEdit) return
                    setSaving(true)
                    const newStart = new Date(movedEdit.start)
                    const newEnd = new Date(movedEdit.end)
                    try {
                      if (movedConfirm.type === 'job') {
                        const supabase = createClient()
                        await supabase
                          .from('jobs')
                          .update({
                            scheduled_at: newStart.toISOString(),
                            notes: movedEdit.notes ?? null,
                            updated_at: new Date().toISOString(),
                          })
                          .eq('id', movedConfirm.job.id)
                        fetch(`/api/integrations/google/sync/job/${movedConfirm.job.id}`, { method: 'POST' }).catch(() => {})
                        fetchJobs()
                        setMovedConfirm({ ...movedConfirm, newStart, newEnd })
                        setMovedEdit({ ...movedEdit, start: toDatetimeLocal(newStart), end: toDatetimeLocal(newEnd) })
                      } else {
                        await fetch(`/api/integrations/google/events/${encodeURIComponent(movedConfirm.googleEventId)}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            start: newStart.toISOString(),
                            end: newEnd.toISOString(),
                            summary: movedEdit.summary ?? movedConfirm.summary,
                          }),
                        })
                        fetchGoogleEvents()
                        setMovedConfirm({ ...movedConfirm, summary: movedEdit.summary ?? movedConfirm.summary, newStart, newEnd })
                        setMovedEdit({ ...movedEdit, start: toDatetimeLocal(newStart), end: toDatetimeLocal(newEnd), summary: movedEdit.summary ?? movedConfirm.summary })
                      }
                    } catch {
                      // ignore
                    }
                    setSaving(false)
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Update'}
                </Button>
                {movedConfirm.type === 'job' && (
                  <label className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={sendNotifyAfterMove}
                      onChange={(e) => setSendNotifyAfterMove(e.target.checked)}
                      className="rounded border-[var(--border)]"
                    />
                    <span className="text-sm text-[var(--text)]">Send SMS/email to customer</span>
                  </label>
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                {movedConfirm.type === 'job' && sendNotifyAfterMove && (
                  <Button
                    onClick={async () => {
                      if (movedConfirm.type !== 'job' || !movedEdit) return
                      const { job, newStart, newEnd } = movedConfirm
                      try {
                        await fetch(`/api/jobs/${job.id}/notify`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'reschedule',
                            scheduledAt: newStart.toISOString(),
                            newStart: newStart.toISOString(),
                            newEnd: newEnd.toISOString(),
                          }),
                        })
                      } catch {
                        // ignore
                      }
                      setMovedConfirm(null)
                      setMovedEdit(null)
                    }}
                  >
                    Send notification
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setMovedConfirm(null); setMovedEdit(null) }}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit time modal */}
      <Dialog open={!!editTimeModal} onOpenChange={(open) => !open && setEditTimeModal(null)}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setEditTimeModal(null)} />
          <DialogHeader>
            <DialogTitle>Edit start & end time</DialogTitle>
          </DialogHeader>
          {editTimeModal && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">Actual times shown on calendar. Adjust if the job started or ended at a different time.</p>
              <div>
                <Label>Start</Label>
                <DateTimeInput
                  value={editTimeModal.start}
                  onChange={(e) => setEditTimeModal((m) => (m ? { ...m, start: e.target.value } : null))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End</Label>
                <DateTimeInput
                  value={editTimeModal.end}
                  onChange={(e) => setEditTimeModal((m) => (m ? { ...m, end: e.target.value } : null))}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEditTimeSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setEditTimeModal(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <JobDetailPopup
        open={!!selectedJobId}
        jobId={selectedJobId}
        onClose={() => {
          setSelectedJobId(null)
          fetchJobs()
        }}
        onDeleted={fetchJobs}
        onOpenEdit={(id) => {
          setSelectedJobId(null)
          setEditJobId(id)
          setEditModalOpen(true)
        }}
      />

      <ScheduleJobDetailModal
        open={createModalOpen || editModalOpen}
        jobId={createModalOpen ? null : editJobId}
        initialScheduledAt={createModalOpen ? date + 'T09:00' : undefined}
        onClose={() => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          setEditJobId(null)
        }}
        onSaved={() => {
          fetchJobs()
          setCreateModalOpen(false)
          setEditModalOpen(false)
          setEditJobId(null)
        }}
      />
    </div>
  )
}
