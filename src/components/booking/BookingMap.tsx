'use client'

import { useEffect, useRef, useState } from 'react'
import { BOOKING_DARK_MAP_STYLES, BOOKING_LIGHT_MAP_STYLES } from './BOOKING_MAP_STYLES'

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 }

interface BookingMapProps {
  mapReady: boolean
  center: { lat: number; lng: number } | null
  markerPosition: { lat: number; lng: number } | null
  onMapReady?: (map: google.maps.Map) => void
  mapTheme?: 'dark' | 'light' | string | null
}

declare global {
  interface Window {
    google?: typeof google
    __bookingMapInit?: (map: google.maps.Map) => void
  }
}

export function BookingMap({ mapReady, center, markerPosition, onMapReady, mapTheme }: BookingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const onMapReadyRef = useRef(onMapReady)
  onMapReadyRef.current = onMapReady

  const styles = mapTheme === 'light' ? BOOKING_LIGHT_MAP_STYLES : BOOKING_DARK_MAP_STYLES

  useEffect(() => {
    if (!mapReady || !containerRef.current || !window.google) return

    const initialCenter = center ?? DEFAULT_CENTER
    const map = new window.google.maps.Map(containerRef.current, {
      center: initialCenter,
      zoom: 12,
      styles,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
      gestureHandling: 'none',
      keyboardShortcuts: false,
    })
    mapRef.current = map
    onMapReadyRef.current?.(map)
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, center?.lat, center?.lng, mapTheme])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !markerPosition) {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      return
    }
    map.panTo(markerPosition)
    map.setZoom(15)
    if (!markerRef.current && window.google) {
      markerRef.current = new window.google.maps.Marker({
        position: markerPosition,
        map,
      })
    } else if (markerRef.current) {
      markerRef.current.setPosition(markerPosition)
    }
  }, [markerPosition])

  if (scriptError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--booking-bg,#212121)] text-[var(--text-muted)] text-sm">
        {scriptError}
      </div>
    )
  }

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" aria-hidden />
}
