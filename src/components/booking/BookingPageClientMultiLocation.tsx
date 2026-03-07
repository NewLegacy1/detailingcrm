'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { BookingContext, MaintenanceContext } from '@/app/book/[slug]/page'
import { BookingPageClient } from './BookingPageClient'
import type { LocationCardLocation } from './LocationCard'

interface BookingPageClientMultiLocationProps {
  slug: string
  /** Org-level context (used until a location is selected; then we use location-scoped context). */
  initialContext: BookingContext
  locations: LocationCardLocation[]
  maintenanceContext?: MaintenanceContext | null
}

/**
 * Multi-location booking: same main booking page with location selector added.
 * User sees map + address + "Choose location" on the same page; address auto-assigns/sorts locations.
 * Supports ?location=uuid to pre-select (e.g. embed).
 */
export function BookingPageClientMultiLocation({
  slug,
  initialContext,
  locations: initialLocations,
  maintenanceContext = null,
}: BookingPageClientMultiLocationProps) {
  const searchParams = useSearchParams()
  const [locations, setLocations] = useState<LocationCardLocation[]>(initialLocations)
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

  // Pre-select from ?location=uuid
  useEffect(() => {
    if (validPreSelectId && !selectedLocationId && !locationContext) {
      setSelectedLocationId(validPreSelectId)
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
          setSelectedLocationId(null)
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
          setSelectedLocationId(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, selectedLocationId])

  const handleSelectLocation = useCallback((locationId: string) => {
    setSelectedLocationId(locationId)
  }, [])

  const handleAddressSelect = useCallback((lat: number, lng: number) => {
    fetch(`/api/booking/locations?slug=${encodeURIComponent(slug)}&lat=${lat}&lng=${lng}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { locations?: LocationCardLocation[]; suggestedLocationId?: string } | null) => {
        if (data?.locations?.length) setLocations(data.locations)
        if (data?.suggestedLocationId && data.locations?.some((loc) => loc.id === data.suggestedLocationId)) {
          setSelectedLocationId(data.suggestedLocationId)
        }
      })
      .catch(() => {})
  }, [slug])

  const context = locationContext ?? initialContext
  const showLocationSelector = locations.length > 0

  return (
    <BookingPageClient
      slug={slug}
      context={context}
      maintenanceContext={maintenanceContext}
      locationId={selectedLocationId}
      locations={showLocationSelector ? locations : undefined}
      onSelectLocation={showLocationSelector ? handleSelectLocation : undefined}
      onAddressSelect={showLocationSelector ? handleAddressSelect : undefined}
      contextLoading={loadingContext && !!selectedLocationId}
      contextError={contextError}
    />
  )
}
