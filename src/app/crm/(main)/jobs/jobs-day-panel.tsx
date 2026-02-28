'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface JobsDayPanelProps {
  date: string
  datesWithJobs: string[]
  crew: { id: string; display_name: string | null; jobCount: number }[]
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// Sun=0 .. Sat=6; use index as key since abbreviations repeat (S, T)
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

function getMonthDays(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const last = new Date(year, month + 1, 0)
  const daysInMonth = last.getDate()
  const rows: (number | null)[][] = []
  let row: (number | null)[] = []
  for (let i = 0; i < startDay; i++) row.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d)
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

export function JobsDayPanel({ date, datesWithJobs, crew }: JobsDayPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const d = new Date(date + 'T12:00:00')
  const year = d.getFullYear()
  const month = d.getMonth()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  function setDate(newDate: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', newDate)
    router.push(crmPath(`/jobs?${params.toString()}`))
  }

  function prevMonth() {
    const m = new Date(year, month - 1, 1)
    setDate(m.toISOString().slice(0, 10))
  }

  function nextMonth() {
    const m = new Date(year, month + 1, 1)
    setDate(m.toISOString().slice(0, 10))
  }

  function onDayClick(day: number | null) {
    if (day === null) return
    const newDate = new Date(year, month, day).toISOString().slice(0, 10)
    setDate(newDate)
  }

  const monthGrid = getMonthDays(year, month)
  const monthLabel = `${MONTH_NAMES[month]} ${year}`

  return (
    <aside
      className="w-[300px] shrink-0 border-l overflow-y-auto p-5 relative"
      style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(to top, rgba(0,184,245,0.07) 0%, rgba(0,184,245,0.04) 45%, transparent 100%), var(--surface-1)',
      }}
    >
      <div className="mb-4 uppercase tracking-wider" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)' }}>
        {monthLabel}
      </div>
      <div className="rounded-[10px] border p-3.5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold" style={{ fontSize: '0.78rem', color: 'var(--text-1)' }}>{monthLabel}</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              className="flex items-center justify-center rounded border transition-colors hover:border-[var(--border-hi)] hover:text-[var(--text-1)]"
              style={{ width: 20, height: 20, borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
            >
              <ChevronLeft className="h-2.5 w-2.5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="flex items-center justify-center rounded border transition-colors hover:border-[var(--border-hi)] hover:text-[var(--text-1)]"
              style={{ width: 20, height: 20, borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-2)' }}
            >
              <ChevronRight className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {DAY_NAMES.map((name, i) => (
            <div key={`day-head-${i}`} className="text-center py-1 font-bold" style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>
              {name}
            </div>
          ))}
          {monthGrid.flat().map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} className="py-1 text-center" style={{ color: 'var(--text-3)', fontSize: '0.7rem' }} />
            }
            const dayKey = new Date(year, month, day).toISOString().slice(0, 10)
            const isToday = dayKey === todayKey
            const hasJob = datesWithJobs.includes(dayKey)
            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => onDayClick(day)}
                className="font-mono py-1 rounded-md transition-colors relative text-center text-[0.7rem] hover:bg-[var(--surface-3)]"
                style={{
                  background: isToday ? 'var(--blue)' : 'transparent',
                  color: isToday ? 'white' : 'var(--text-2)',
                  fontWeight: isToday ? 700 : undefined,
                }}
              >
                {day}
                {hasJob && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 rounded-full"
                    style={{ bottom: 2, width: 3, height: 3, background: isToday ? '#fff' : 'var(--blue)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-4 uppercase tracking-wider font-bold" style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
          Crew Today
        </div>
        <div className="space-y-0">
          {crew.length === 0 ? (
            <p className="text-[0.75rem]" style={{ color: 'var(--text-3)' }}>No crew assigned</p>
          ) : (
            crew.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2.5 py-2 border-b last:border-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                >
                  {(member.display_name ?? '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.78rem] font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                    {member.display_name ?? 'Unnamed'}
                  </div>
                  <div className="text-[0.68rem]" style={{ color: 'var(--text-3)' }}>
                    {member.jobCount} job{member.jobCount !== 1 ? 's' : ''} assigned
                  </div>
                </div>
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--green)]"
                  aria-hidden
                />
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
