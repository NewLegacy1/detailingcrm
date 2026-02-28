'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface BookingSearchCardProps {
  businessName: string
  logoUrl: string | null
  tagline: string | null
  addressValue: string
  onAddressChange: (value: string) => void
  onPlaceSelect: (place: { address: string; lat: number; lng: number }) => void
  mapReady: boolean
  disabled?: boolean
}

export function BookingSearchCard({
  businessName,
  logoUrl,
  tagline,
  addressValue,
  onAddressChange,
  onPlaceSelect,
  mapReady,
  disabled,
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
      className="relative z-10 w-full max-w-md mx-auto px-4"
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--booking-bg,#212121)] shadow-xl p-6">
        <div className="flex flex-col items-center gap-3 mb-4">
          {logoUrl && <img src={logoUrl} alt="" className="h-12 w-auto object-contain" />}
          <h1 className="text-lg font-semibold text-[var(--text)] text-center">Book with {businessName}</h1>
          {tagline && <p className="text-sm text-[var(--text-muted)] text-center">{tagline}</p>}
        </div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Enter your address
        </label>
        <input
          ref={inputRef}
          type="text"
          value={addressValue}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Start typing your address..."
          disabled={disabled}
          className="w-full rounded-lg border border-[var(--border-hi)] bg-[var(--booking-surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>
    </motion.div>
  )
}
