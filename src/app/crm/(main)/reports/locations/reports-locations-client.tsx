'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'

interface LocationRow {
  id: string
  name: string
  address: string | null
}

interface LocationStats {
  location_id: string
  booking_count: number
  revenue_from_payments: number
  revenue_estimated: number
}

interface ReportsLocationsClientProps {
  locations: LocationRow[]
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export function ReportsLocationsClient({ locations }: ReportsLocationsClientProps) {
  const [stats, setStats] = useState<Record<string, LocationStats | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (locations.length === 0) {
      setLoading(false)
      return
    }
    let cancelled = false
    const map: Record<string, LocationStats | null> = {}
    Promise.all(
      locations.map((loc) =>
        fetch(`/api/locations/${loc.id}/stats`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: LocationStats | null) => {
            if (!cancelled && data) map[loc.id] = data
          })
      )
    ).then(() => {
      if (!cancelled) {
        setStats(map)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [locations])

  if (locations.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No locations. Add locations in Settings → Locations.</p>
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
            <th className="text-left p-3 font-medium text-[var(--text)]">Location</th>
            <th className="text-right p-3 font-medium text-[var(--text)]">Bookings</th>
            <th className="text-right p-3 font-medium text-[var(--text)]">Revenue (payments)</th>
            <th className="text-right p-3 font-medium text-[var(--text)]">Revenue (est.)</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => {
            const s = stats[loc.id]
            return (
              <tr key={loc.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    <div>
                      <div className="font-medium text-[var(--text)]">{loc.name}</div>
                      {loc.address && (
                        <div className="text-xs text-[var(--text-muted)] truncate max-w-xs">{loc.address}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-right text-[var(--text)]">
                  {loading ? '—' : (s?.booking_count ?? 0)}
                </td>
                <td className="p-3 text-right text-[var(--text)]">
                  {loading ? '—' : currency(s?.revenue_from_payments ?? 0)}
                </td>
                <td className="p-3 text-right text-[var(--text-muted)]">
                  {loading ? '—' : currency(s?.revenue_estimated ?? 0)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
