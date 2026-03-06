'use client'

import * as React from 'react'
import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useGoogleMapsPlaces } from '@/hooks/use-google-maps-places'

export interface AddressAutocompleteProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: { address: string; lat?: number; lng?: number }) => void
}

export const AddressAutocomplete = React.forwardRef<
  HTMLInputElement,
  AddressAutocompleteProps
>(function AddressAutocomplete(
  { value, onChange, onPlaceSelect, className, placeholder = 'Service address', ...props },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const { ready } = useGoogleMapsPlaces()

  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
    },
    [ref]
  )

  useEffect(() => {
    if (!ready || !inputRef.current || !window.google?.maps?.places) return
    const input = inputRef.current
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['address'],
      fields: ['formatted_address', 'geometry'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const address = place.formatted_address ?? ''
      if (address) {
        onChange(address)
        const loc = place.geometry?.location
        if (onPlaceSelect)
          onPlaceSelect({
            address,
            lat: loc ? loc.lat() : undefined,
            lng: loc ? loc.lng() : undefined,
          })
      }
    })
    autocompleteRef.current = autocomplete
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        } catch (_) {}
      }
      autocompleteRef.current = null
    }
  }, [ready, onChange, onPlaceSelect])

  return (
    <input
      ref={setRefs}
      type="text"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]/60',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})
