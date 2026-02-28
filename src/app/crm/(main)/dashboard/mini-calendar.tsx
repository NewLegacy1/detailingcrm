import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'

interface MiniCalendarProps {
  jobDates: string[]
  currentMonth: string
}

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

export function MiniCalendar({ jobDates, currentMonth }: MiniCalendarProps) {
  const [y, m] = currentMonth.split('-').map(Number)
  const monthIndex = m - 1
  const grid = getMonthDays(y, monthIndex)
  const todayKey = new Date().toISOString().slice(0, 10)
  const jobSet = new Set(jobDates)

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-2)',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {new Date(y, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
            {d}
          </div>
        ))}
        {grid.flat().map((cell, i) => {
          if (!cell) return <div key={i} />
          const key = cell.toISOString().slice(0, 10)
          const isToday = key === todayKey
          const hasJob = jobSet.has(key)
          return (
            <Link
              key={key}
              href={crmPath(`/schedule?date=${key}`)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                borderRadius: 6,
                background: isToday ? 'var(--blue)' : 'transparent',
                color: isToday ? '#fff' : 'var(--text-2)',
                fontSize: 13,
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              {cell.getDate()}
              {hasJob && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: isToday ? '#fff' : 'var(--blue)',
                  }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
