'use client'

import { useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'

interface BookingGeoStepProps {
  /** Called when we have lat/lng (from browser geo or manual address geocode). */
  onSuccess: (lat: number, lng: number) => void
  /** Called when user skips; parent can still show location step without distance. */
  onSkip?: () => void
}

export function BookingGeoStep({ onSuccess, onSkip }: BookingGeoStepProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)

  const handleUseMyLocation = () => {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError('Location is not supported by your browser.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        onSuccess(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setLoading(false)
        setGeoError('We couldn’t get your location. Enter your address below or skip.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = address.trim()
    if (!trimmed) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(trimmed)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Address not found. Try a full address.')
        setLoading(false)
        return
      }
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        onSuccess(data.lat, data.lng)
      } else {
        setError('Could not get coordinates for this address.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--booking-bg,#212121)] text-[var(--text)]">
      <div className="flex-1 px-4 pt-6 pb-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <h1 className="text-xl font-semibold text-[var(--text)] mb-1">Where are you?</h1>
        <p className="text-sm text-[var(--text-2)] mb-6">
          We’ll show you the nearest locations. You can also skip and choose any location.
        </p>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Navigation className="h-5 w-5 shrink-0" />
            Use my location
          </button>

          {geoError && (
            <p className="text-sm text-amber-500/90">{geoError}</p>
          )}

          <div className="text-sm text-[var(--text-2)] text-center">or</div>

          <form onSubmit={handleAddressSubmit} className="space-y-2">
            <div className="flex gap-2">
              <span className="flex items-center pl-3 rounded-l-xl border border-[var(--border)] bg-[var(--booking-surface)] text-[var(--text-2)]">
                <MapPin className="h-4 w-4 shrink-0" />
              </span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address or area"
                className="flex-1 py-3 pr-3 rounded-r-xl border border-[var(--border)] bg-[var(--booking-surface)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="w-full py-2.5 px-4 rounded-xl font-medium border border-[var(--border)] bg-[var(--booking-surface)] text-[var(--text)] hover:bg-[var(--booking-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Find locations near me
            </button>
            {error && <p className="text-sm text-amber-500/90">{error}</p>}
          </form>

          {onSkip && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={onSkip}
                disabled={loading}
                className="text-sm text-[var(--text-2)] underline hover:text-[var(--text)] disabled:opacity-50"
              >
                Skip — choose any location
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
