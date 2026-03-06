'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { BookingContext, MaintenanceContext } from '@/app/book/[slug]/page'
import { BookingPageClient } from './BookingPageClient'
import { BookingLocationStep } from './BookingLocationStep'
import { BookingGeoStep } from './BookingGeoStep'
import type { LocationCardLocation } from './LocationCard'

interface BookingPageClientMultiLocationProps {
  slug: string
  /** Org-level context (used only to show location step; after selection we use location-scoped context). */
  initialContext: BookingContext
  locations: LocationCardLocation[]
  maintenanceContext?: MaintenanceContext | null
}

/**
 * Multi-location booking wrapper: geo step (optional) → location step → location-scoped booking.
 * Supports ?location=uuid to pre-select and skip geo + location steps (e.g. embed).
 */
export function BookingPageClientMultiLocation({
  slug,
  initialContext,
  locations: initialLocations,
  maintenanceContext = null,
}: BookingPageClientMultiLocationProps) {
  const searchParams = useSearchParams()
  const [locations, setLocations] = useState<LocationCardLocation[]>(initialLocations)
  const [geoComplete, setGeoComplete] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [locationContext, setLocationContext] = useState<BookingContext | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)

  const locationParam = searchParams.get('location')?.trim()
  const validPreSelectId =
    locationParam && locations.some((loc) => loc.id === locationParam) ? locationParam : null

  // Enrich locations with next_available from API (no lat/lng)
  useEffect(() => {
    if (initialLocations.length === 0) return
    fetch(`/api/booking/locations?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: { locations?: LocationCardLocation[] } | null) => {
        if (data?.locations?.length) setLocations(data.locations)
      })
      .catch(() => {})
  }, [slug, initialLocations.length])

  // Pre-select from ?location=uuid (skip geo + location steps)
  useEffect(() => {
    if (validPreSelectId && !selectedLocationId && !locationContext) {
      setSelectedLocationId(validPreSelectId)
      setGeoComplete(true)
    }
  }, [validPreSelectId, selectedLocationId, locationContext])

  // Fetch location-scoped context when selectedLocationId is set
  useEffect(() => {
    if (!selectedLocationId) {
      setLocationContext(null)
      return
    }
    let cancelled = false
    setLoadingContext(true)
    setContextError(null)
    fetch(`/api/booking/booking-context?slug=${encodeURIComponent(slug)}&locationId=${encodeURIComponent(selectedLocationId)}`)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          if (res.status === 404) setContextError('Location no longer available.')
          else setContextError('Unable to load this location.')
          setLocationContext(null)
          setLoadingContext(false)
          return
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled || data == null) return
        setLocationContext(data as BookingContext)
        setContextError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setContextError('Something went wrong.')
          setLocationContext(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, selectedLocationId])

  const handleGeoSuccess = (lat: number, lng: number) => {
    fetch(`/api/booking/locations?slug=${encodeURIComponent(slug)}&lat=${lat}&lng=${lng}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: { locations?: LocationCardLocation[] } | null) => {
        if (data?.locations?.length) setLocations(data.locations)
      })
      .catch(() => {})
      .finally(() => setGeoComplete(true))
  }

  const handleGeoSkip = () => setGeoComplete(true)

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocationId(locationId)
  }

  // Phase 1: Geo (nearest locations). Skip when ?location= is set.
  if (!geoComplete && !validPreSelectId) {
    return (
      <BookingGeoStep
        onSuccess={handleGeoSuccess}
        onSkip={handleGeoSkip}
      />
    )
  }

  // Phase 2: Location selection
  if (!selectedLocationId) {
    return (
      <BookingLocationStep
        slug={slug}
        locations={locations}
        onSelect={handleSelectLocation}
      />
    )
  }

  // Loading location-scoped context
  if (loadingContext || !locationContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--booking-bg,#212121)] text-[var(--text)]">
        <div className="text-center">
          {contextError ? (
            <p className="text-[var(--text-2)]">{contextError}</p>
          ) : (
            <p className="text-[var(--text-2)]">Loading…</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <BookingPageClient
      slug={slug}
      context={locationContext}
      maintenanceContext={maintenanceContext}
      locationId={selectedLocationId}
    />
  )
}
