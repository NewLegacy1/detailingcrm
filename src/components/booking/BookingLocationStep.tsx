'use client'

import { useState } from 'react'
import { LocationCard, type LocationCardLocation } from './LocationCard'

interface BookingLocationStepProps {
  slug: string
  locations: LocationCardLocation[]
  onSelect: (locationId: string) => void
}

export function BookingLocationStep({ locations, onSelect }: BookingLocationStepProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleConfirm = () => {
    if (selectedId) onSelect(selectedId)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--booking-bg,#212121)] text-[var(--text)]">
      <div className="flex-1 px-4 pt-6 pb-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <h1 className="text-xl font-semibold text-[var(--text)] mb-1">Choose a location</h1>
        <p className="text-sm text-[var(--text-2)] mb-6">Select where you’d like to book.</p>
        <div className="space-y-3">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              selected={selectedId === loc.id}
              onSelect={() => setSelectedId(loc.id)}
            />
          ))}
        </div>
        <div className="mt-8">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedId}
            className="w-full py-3 px-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: selectedId ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
