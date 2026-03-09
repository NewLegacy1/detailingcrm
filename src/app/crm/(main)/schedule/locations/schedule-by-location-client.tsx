'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { Input } from '@/components/ui/input'
import { MapPin } from 'lucide-react'

interface LocationRow {
  id: string
  name: string
  address: string | null
}

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string | null
  location_id: string | null
  clients: { name: string } | { name: string }[] | null
  services: { name: string; duration_mins: number } | { name: string; duration_mins: number }[] | null
}

interface ScheduleByLocationClientProps {
  initialDate: string
  locations: LocationRow[]
  jobs: JobRow[]
  timeZone: string
}

function getDateInTimezone(utcDate: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(utcDate)
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? ''
  const s = `${get('year')}-${get('month')}-${get('day')}`.replace(/\//g, '-')
  const [y, m, d] = s.split(/[-/]/).map((x) => x.padStart(2, '0'))
  return `${y}-${m}-${d}`
}

function formatTime(iso: string, timeZone: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: 'numeric', minute: '2-digit' }).format(d)
}

function clientName(clients: JobRow['clients']): string {
  if (!clients) return '—'
  const c = Array.isArray(clients) ? clients[0] : clients
  return c?.name ?? '—'
}

function serviceName(services: JobRow['services']): string {
  if (!services) return '—'
  const s = Array.isArray(services) ? services[0] : services
  return s?.name ?? '—'
}

export function ScheduleByLocationClient({
  initialDate,
  locations,
  jobs,
  timeZone,
}: ScheduleByLocationClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const dateStr = initialDate

  const jobsByLocation = new Map<string | null, JobRow[]>()
  jobsByLocation.set(null, [])
  for (const loc of locations) jobsByLocation.set(loc.id, [])
  for (const job of jobs) {
    const key = job.location_id ?? null
    if (!jobsByLocation.has(key)) jobsByLocation.set(key, [])
    jobsByLocation.get(key)!.push(job)
  }
  for (const [, list] of jobsByLocation) list.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return
    const next = new URLSearchParams(searchParams.toString())
    next.set('date', v)
    router.push(crmPath('/schedule/locations') + '?' + next.toString())
  }

  const locationList = locations as { id: string; name: string; address: string | null }[]
  const unassigned = jobsByLocation.get(null) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="text-sm text-[var(--text-muted)]">Date</label>
        <Input
          type="date"
          value={dateStr}
          onChange={handleDateChange}
          className="w-40"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {locationList.map((loc) => {
          const list = jobsByLocation.get(loc.id) ?? []
          return (
            <div
              key={loc.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                <div>
                  <div className="font-medium text-[var(--text)]">{loc.name}</div>
                  {loc.address && (
                    <div className="text-xs text-[var(--text-muted)] truncate">{loc.address}</div>
                  )}
                </div>
              </div>
              <ul className="space-y-2">
                {list.length === 0 ? (
                  <li className="text-sm text-[var(--text-muted)]">No jobs on this date</li>
                ) : (
                  list.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={crmPath(`/jobs/${job.id}`)}
                        className="block text-sm rounded border border-[var(--border)] p-2 hover:bg-[var(--bg)]"
                      >
                        <span className="font-medium">{formatTime(job.scheduled_at, timeZone)}</span>
                        <span className="text-[var(--text-muted)]"> — {clientName(job.clients)} · {serviceName(job.services)}</span>
                        {job.address && (
                          <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">{job.address}</div>
                        )}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )
        })}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="font-medium text-[var(--text)] mb-3">No location / legacy</div>
          <ul className="space-y-2">
            {unassigned.length === 0 ? (
              <li className="text-sm text-[var(--text-muted)]">No jobs</li>
            ) : (
              unassigned.map((job) => (
                <li key={job.id}>
                  <Link
                    href={crmPath(`/jobs/${job.id}`)}
                    className="block text-sm rounded border border-[var(--border)] p-2 hover:bg-[var(--bg)]"
                  >
                    <span className="font-medium">{formatTime(job.scheduled_at, timeZone)}</span>
                    <span className="text-[var(--text-muted)]"> — {clientName(job.clients)} · {serviceName(job.services)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
