'use client'

import { MapPin, Clock } from 'lucide-react'

export interface LocationCardLocation {
  id: string
  name: string
  address?: string | null
  distance_km?: number | null
  next_available?: string | null
}

interface LocationCardProps {
  location: LocationCardLocation
  selected?: boolean
  onSelect: () => void
}

export function LocationCard({ location, selected, onSelect }: LocationCardProps) {
  const distanceStr = location.distance_km != null ? `${location.distance_km.toFixed(1)} km away` : null
  let nextStr: string | null = null
  if (location.next_available) {
    try {
      const d = new Date(location.next_available)
      if (!isNaN(d.getTime())) nextStr = `Next: ${d.toLocaleDateString(undefined, { weekday: 'short' })} ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${selected ? 'border-[var(--accent)] bg-[var(--booking-surface-hover)]' : 'border-[var(--border)] bg-[var(--booking-surface)] hover:border-[var(--border-hi)] hover:bg-[var(--booking-surface-hover)]'}`}
    >
      <div className="font-medium text-[var(--text)]">{location.name}</div>
      {location.address && (
        <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-2)]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{location.address}</span>
        </div>
      )}
      {distanceStr && <div className="mt-1 text-xs text-[var(--text-muted)]">{distanceStr}</div>}
      {nextStr && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent)]">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{nextStr}</span>
        </div>
      )}
    </button>
  )
}
