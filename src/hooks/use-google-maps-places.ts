'use client'

import { useState, useEffect } from 'react'

const MAPS_SCRIPT_ID = 'data-crm-maps'
const MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'

declare global {
  interface Window {
    __crmMapsReady?: () => void
    google?: typeof google
  }
}

/** Loads Google Maps JS with Places once. Reuses script if already loaded (booking/branding). */
export function useGoogleMapsPlaces(): { ready: boolean } {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const setReadyState = () => setReady(!!window.google)

    // Reuse any existing Maps script (booking, branding, or previous CRM load)
    const existing =
      document.querySelector(`script[${MAPS_SCRIPT_ID}]`) ||
      document.querySelector('script[data-booking-maps]') ||
      document.querySelector('script[data-branding-maps]')
    if (existing) {
      if (window.google?.maps?.places) {
        setReadyState()
        return
      }
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          setReadyState()
          clearInterval(interval)
        }
      }, 100)
      return () => clearInterval(interval)
    }

    window.__crmMapsReady = setReadyState
    const script = document.createElement('script')
    script.setAttribute(MAPS_SCRIPT_ID, 'true')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&callback=__crmMapsReady`
    script.async = true
    script.defer = true
    script.onerror = () => setReady(false)
    document.head.appendChild(script)
    return () => {
      delete window.__crmMapsReady
    }
  }, [])

  return { ready }
}
