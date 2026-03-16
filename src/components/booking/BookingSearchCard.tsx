'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'

interface BookingSearchCardProps {
  businessName: string
  logoUrl: string | null
  tagline: string | null
  addressValue: string
  onAddressChange: (value: string) => void
  onPlaceSelect: (place: { address: string; lat: number; lng: number }) => void
  mapReady: boolean
  disabled?: boolean
  /** Rendered at the bottom of the card (e.g. "Already a customer? Sign in") */
  footer?: React.ReactNode
}

const DEFAULT_INTRO = "We come to you — enter your address to see services and available times."
const DEFAULT_NEXT_STEP = "Then choose a service and time that works for you."

export function BookingSearchCard({
  businessName,
  logoUrl,
  tagline,
  addressValue,
  onAddressChange,
  onPlaceSelect,
  mapReady,
  disabled,
  footer,
}: BookingSearchCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    if (!mapReady || !window.google || !inputRef.current) return
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'geometry'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const geo = place.geometry?.location
      if (geo && place.formatted_address) {
        onPlaceSelect({
          address: place.formatted_address,
          lat: geo.lat(),
          lng: geo.lng(),
        })
      }
    })
    autocompleteRef.current = autocomplete
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
      autocompleteRef.current = null
    }
  }, [mapReady, onPlaceSelect])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative z-10 w-full max-w-md mx-auto px-4"
    >
      <div
        className="relative rounded-2xl border border-[var(--border)] shadow-2xl p-6 overflow-hidden"
        style={{
          backgroundColor: 'var(--booking-card-bg, color-mix(in srgb, var(--booking-bg,#212121) 94%, transparent))',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 0 0 1px var(--border), 0 25px 50px -12px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex flex-col items-center gap-3 mb-5">
          {logoUrl && (
            <img src={logoUrl} alt="" className="h-12 w-auto object-contain drop-shadow-sm" />
          )}
          <h1 className="text-xl font-semibold text-center tracking-tight" style={{ color: 'var(--booking-header-text, var(--text))' }}>
            Book with {businessName}
          </h1>
          {tagline && (
            <p className="text-sm text-[var(--text-muted)] text-center max-w-[85%]">{tagline}</p>
          )}
          <p className="text-sm text-[var(--text-2)] text-center leading-relaxed max-w-[90%]">
            {DEFAULT_INTRO}
          </p>
        </div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Enter your address
        </label>
        <div className="relative">
          <MapPin
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={addressValue}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Start typing your address..."
            disabled={disabled}
            className="w-full rounded-xl border border-[var(--border-hi)] bg-[var(--booking-surface)] pl-10 pr-4 py-3.5 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-shadow"
          />
        </div>
        <p className="mt-2.5 text-xs text-[var(--text-muted)]">
          {DEFAULT_NEXT_STEP}
        </p>
        {footer != null ? (
          <div className="mt-4 pt-3 min-h-[2.5rem] border-t border-[var(--border)] text-center text-[var(--text)] flex items-center justify-center">
            {footer}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}
