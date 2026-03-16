'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BOOKING_DARK_MAP_STYLES } from '@/components/booking/BOOKING_MAP_STYLES'

const MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 }
const DEFAULT_RADIUS_KM = 10
const MIN_RADIUS_KM = 1
const MAX_RADIUS_KM = 100

declare global {
  interface Window {
    __locationMapPickerReady?: () => void
    google?: typeof google
  }
}

export interface LocationMapPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCenter: { lat: number; lng: number } | null
  initialRadiusKm: number | null
  onConfirm: (center: { lat: number; lng: number }, radiusKm: number) => void
}

export function LocationMapPicker({
  open,
  onOpenChange,
  initialCenter,
  initialRadiusKm,
  onConfirm,
}: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)
  const centerMarkerRef = useRef<google.maps.Marker | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm ?? DEFAULT_RADIUS_KM)

  // Load Google Maps
  useEffect(() => {
    if (!open) return
    const existing = document.querySelector('script[data-location-map-picker]')
    if (existing) {
      if (window.google?.maps) {
        setMapsReady(true)
        setScriptError(null)
        return
      }
      const interval = setInterval(() => {
        if (window.google?.maps) {
          setMapsReady(true)
          setScriptError(null)
          clearInterval(interval)
        }
      }, 100)
      return () => clearInterval(interval)
    }
    window.__locationMapPickerReady = () => {
      setMapsReady(!!window.google?.maps)
      setScriptError(window.google?.maps ? null : 'Maps failed to load')
    }
    const script = document.createElement('script')
    script.setAttribute('data-location-map-picker', 'true')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&callback=__locationMapPickerReady`
    script.async = true
    script.defer = true
    script.onerror = () => setScriptError('Failed to load Google Maps')
    document.head.appendChild(script)
    return () => {
      delete window.__locationMapPickerReady
    }
  }, [open])

  // Init map, circle, and center marker when container and maps are ready
  useEffect(() => {
    if (!open || !mapsReady || !containerRef.current || !window.google) return

    const center = initialCenter ?? DEFAULT_CENTER
    const radiusM = (initialRadiusKm ?? DEFAULT_RADIUS_KM) * 1000

    const map = new window.google.maps.Map(containerRef.current, {
      center,
      zoom: 10,
      styles: BOOKING_DARK_MAP_STYLES,
      mapTypeControl: true,
      zoomControl: true,
      fullscreenControl: true,
      streetViewControl: false,
    })
    mapRef.current = map

    const circle = new window.google.maps.Circle({
      map,
      center,
      radius: radiusM,
      fillColor: '#00b8f5',
      fillOpacity: 0.2,
      strokeColor: '#00b8f5',
      strokeOpacity: 0.8,
      strokeWeight: 2,
    })
    circleRef.current = circle

    const centerMarker = new window.google.maps.Marker({
      map,
      position: center,
      draggable: true,
      title: 'Drag to move service area center',
    })
    centerMarkerRef.current = centerMarker

    centerMarker.addListener('dragend', () => {
      const pos = centerMarker.getPosition()
      if (!pos) return
      circle.setCenter({ lat: pos.lat(), lng: pos.lng() })
    })

    return () => {
      circle.setMap(null)
      centerMarker.setMap(null)
      circleRef.current = null
      centerMarkerRef.current = null
      mapRef.current = null
    }
  }, [open, mapsReady, initialCenter?.lat, initialCenter?.lng, initialRadiusKm])

  // When radius input changes, update circle on map
  const handleRadiusChange = (value: string) => {
    const num = parseFloat(value)
    if (Number.isNaN(num)) return
    const clamped = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, num))
    setRadiusKm(clamped)
    if (circleRef.current) circleRef.current.setRadius(clamped * 1000)
  }

  const handleApply = () => {
    const centerMarker = centerMarkerRef.current
    if (!centerMarker) return
    const pos = centerMarker.getPosition()
    if (!pos) return
    const radiusKmVal = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm))
    onConfirm({ lat: pos.lat(), lng: pos.lng() }, radiusKmVal)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="p-4 pb-2">
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Set service area on map</DialogTitle>
            <DialogClose onClick={() => onOpenChange(false)} className="right-4 top-4" />
          </DialogHeader>
        </div>
        <p className="text-sm text-[var(--text-muted)] px-4 pb-3">
          Drag the center pin to move the service area. Enter the radius below to set the circle size (1–100 km).
        </p>
        <div className="relative w-full h-[400px] bg-[var(--bg)]">
          {scriptError && (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--danger)] text-sm p-4">
              {scriptError}
            </div>
          )}
          {!scriptError && !mapsReady && (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm">
              Loading map…
            </div>
          )}
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: mapsReady && !scriptError ? 'block' : 'none' }}
            aria-hidden
          />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Label htmlFor="map-picker-radius" className="text-sm text-[var(--text)]">
              Service radius (km)
            </Label>
            <Input
              id="map-picker-radius"
              type="number"
              min={MIN_RADIUS_KM}
              max={MAX_RADIUS_KM}
              step={0.5}
              value={radiusKm}
              onChange={(e) => handleRadiusChange(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
