'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import type { BookingContext } from '@/app/book/[slug]/page'
import { isLightBackground } from '@/lib/utils'
import { BookingHeader } from './BookingHeader'
import { BookingMap } from './BookingMap'
import { BookingSearchCard } from './BookingSearchCard'
import { BookingServicePanel } from './BookingServicePanel'
import { BookingRouteSummary } from './BookingRouteSummary'

const BOOKING_BG_DEFAULT = '#212121'
const BOOKING_ACCENT_DEFAULT = '#00b8f5'

/** Text/surface presets for light booking background (dark text). */
const BOOKING_LIGHT_PRESET: Record<string, string> = {
  '--text': '#0f172a',
  '--text-1': '#0f172a',
  '--text-2': '#475569',
  '--text-3': '#64748b',
  '--text-muted': '#64748b',
  '--text-secondary': '#475569',
  '--border': 'rgba(0, 0, 0, 0.08)',
  '--border-hi': 'rgba(0, 0, 0, 0.14)',
  '--booking-surface': 'rgba(0, 0, 0, 0.05)',
  '--booking-surface-hover': 'rgba(0, 0, 0, 0.08)',
}

/** Text/surface presets for dark booking background (light text). */
const BOOKING_DARK_PRESET: Record<string, string> = {
  '--text': '#eef2ff',
  '--text-1': '#eef2ff',
  '--text-2': '#7e8da8',
  '--text-3': '#3d4d65',
  '--text-muted': '#3d4d65',
  '--text-secondary': '#7e8da8',
  '--border': 'rgba(255, 255, 255, 0.1)',
  '--border-hi': 'rgba(255, 255, 255, 0.18)',
  '--booking-surface': 'rgba(255, 255, 255, 0.05)',
  '--booking-surface-hover': 'rgba(255, 255, 255, 0.1)',
}

declare global {
  interface Window {
    __bookingMapReady?: () => void
    google?: typeof google
  }
}

export interface BookingSuccessData {
  serviceName: string
  scheduledAt: string
  address: string
  customerName: string
}

interface BookingPageClientProps {
  slug: string
  context: BookingContext
}

export function BookingPageClient({ slug, context }: BookingPageClientProps) {
  const searchParams = useSearchParams()
  const [mapReady, setMapReady] = useState(false)
  const [addressValue, setAddressValue] = useState('')
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [bookSuccess, setBookSuccess] = useState<BookingSuccessData | null>(null)

  useEffect(() => {
    const depositSuccess = searchParams.get('deposit_success') === '1'
    if (depositSuccess) {
      setBookSuccess({
        serviceName: 'Deposit received — booking confirmed',
        scheduledAt: '',
        address: '',
        customerName: '',
      })
      const url = new URL(window.location.href)
      url.searchParams.delete('deposit_success')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [searchParams])

  const bookingStyle = useMemo(() => {
    const accent = (context.accentColor ?? context.primaryColor ?? BOOKING_ACCENT_DEFAULT).trim() || BOOKING_ACCENT_DEFAULT
    const bg = (context.primaryColor ?? '').trim() || BOOKING_BG_DEFAULT
    const isLight =
      context.theme === 'light' ||
      (context.theme !== 'dark' && isLightBackground(bg))
    const preset = isLight ? BOOKING_LIGHT_PRESET : BOOKING_DARK_PRESET
    const textOverride = (context.bookingTextColor ?? '').trim()
    return {
      ['--accent']: accent,
      ['--booking-bg']: bg,
      background: bg,
      ...preset,
      ...(textOverride ? { ['--text']: textOverride, ['--text-1']: textOverride } : {}),
    } as React.CSSProperties
  }, [context.accentColor, context.primaryColor, context.theme, context.bookingTextColor])

  const mapCenter =
    context.mapLat != null && context.mapLng != null
      ? { lat: context.mapLat, lng: context.mapLng }
      : null

  const handlePlaceSelect = useCallback((place: { address: string; lat: number; lng: number }) => {
    setAddressValue(place.address)
    setMarkerPosition({ lat: place.lat, lng: place.lng })
    setPanelOpen(true)
  }, [])

  useEffect(() => {
    const key =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'
    if (document.querySelector('script[data-booking-maps]')) {
      setMapReady(!!window.google)
      return
    }
    window.__bookingMapReady = () => setMapReady(true)
    const script = document.createElement('script')
    script.setAttribute('data-booking-maps', 'true')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__bookingMapReady`
    script.async = true
    script.defer = true
    script.onerror = () => setMapReady(false)
    document.head.appendChild(script)
    return () => {
      delete window.__bookingMapReady
    }
  }, [])

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden" style={bookingStyle}>
      <BookingHeader businessName={context.businessName} logoUrl={context.logoUrl} />
      <div className="relative flex-1 flex min-h-0 pt-14">
        <div className="absolute inset-0 top-14 overflow-hidden">
          <BookingMap
            mapReady={mapReady}
            center={mapCenter}
            markerPosition={markerPosition}
            mapTheme={context.mapTheme}
          />
        </div>
        <AnimatePresence>
          <BookingServicePanel
            slug={slug}
            services={context.services}
            upsells={context.upsells ?? []}
            showPrices={context.showPrices}
            blackoutDates={context.blackoutDates ?? []}
            bookingPaymentMode={context.bookingPaymentMode ?? 'none'}
            mapReady={mapReady}
            initialAddress={addressValue}
            onBookSuccess={(data) => setBookSuccess(data)}
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        </AnimatePresence>
      </div>

      {!panelOpen && (
        <div className="absolute top-24 left-0 right-0 flex justify-center pointer-events-none px-4 pb-4">
          <div className="pointer-events-auto w-full max-w-md mx-auto">
            <BookingSearchCard
              businessName={context.businessName}
              logoUrl={context.logoUrl}
              tagline={context.tagline}
              addressValue={addressValue}
              onAddressChange={setAddressValue}
              onPlaceSelect={handlePlaceSelect}
              mapReady={mapReady}
            />
          </div>
        </div>
      )}

      <BookingRouteSummary bookSuccess={bookSuccess} businessName={context.businessName} onClose={() => setBookSuccess(null)} />
    </div>
  )
}
