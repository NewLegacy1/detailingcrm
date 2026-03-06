'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import type { BookingContext, MaintenanceContext } from '@/app/book/[slug]/page'
import { isLightBackground, lightenHex, haversineDistanceKm } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { BookingHeader } from './BookingHeader'
import { BookingMap } from './BookingMap'
import { BookingSearchCard } from './BookingSearchCard'
import { BookingServicePanel } from './BookingServicePanel'
import { BookingRouteSummary } from './BookingRouteSummary'
import { BookingAuthModal } from './BookingAuthModal'

const BOOKING_BG_DEFAULT = '#212121'
/** Default accent for prices and highlights when org has no accent set. Light green to match the default dark template. */
const BOOKING_ACCENT_DEFAULT = '#4ade80'

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

/** Text/surface presets for dark booking background. Softer grays for hierarchy, not bright white everywhere. */
const BOOKING_DARK_PRESET: Record<string, string> = {
  '--text': '#e5e5e5',
  '--text-1': '#e5e5e5',
  '--text-2': '#a3a3a3',
  '--text-3': '#737373',
  '--text-muted': '#737373',
  '--text-secondary': '#a3a3a3',
  '--border': 'rgba(255, 255, 255, 0.08)',
  '--border-hi': 'rgba(255, 255, 255, 0.12)',
  '--booking-surface': 'rgba(255, 255, 255, 0.04)',
  '--booking-surface-hover': 'rgba(255, 255, 255, 0.08)',
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

export interface BookingCustomerProfile {
  client: { id: string; name: string; email: string; phone: string; address: string }
  vehicles: { id: string; make: string; model: string; year: number | null; color: string }[]
  pastJobs: { id: string; scheduled_at: string; address: string; status: string; service_name: string | null }[]
}

interface BookingPageClientProps {
  slug: string
  context: BookingContext
  maintenanceContext?: MaintenanceContext | null
  /** Multi-location (Pro): selected location id; included in slot and booking API calls. */
  locationId?: string | null
}

export function BookingPageClient({ slug, context, maintenanceContext = null, locationId = null }: BookingPageClientProps) {
  const searchParams = useSearchParams()
  const [mapReady, setMapReady] = useState(false)
  const [addressValue, setAddressValue] = useState('')
  const [addressError, setAddressError] = useState<string | null>(null)
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [bookSuccess, setBookSuccess] = useState<BookingSuccessData | null>(null)
  const [bookingUser, setBookingUser] = useState<{ id: string; email?: string } | null>(null)
  const [bookingProfile, setBookingProfile] = useState<BookingCustomerProfile | null>(null)
  const [authModal, setAuthModal] = useState<'closed' | 'signin' | 'signup'>('closed')
  const [authModalMessage, setAuthModalMessage] = useState<string | null>(null)
  /** When serviceMode is 'both', customer choice: 'mobile' = at their address, 'shop' = at shop. */
  const [serviceLocation, setServiceLocation] = useState<'mobile' | 'shop'>('mobile')
  const sessionTokenRef = useRef<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const serviceMode = context.serviceMode ?? 'mobile'
  const shopAddress = context.shopAddress ?? null
  const isShopOnly = serviceMode === 'shop'
  const isBoth = serviceMode === 'both'
  const useShopAddress = isShopOnly || (isBoth && serviceLocation === 'shop')
  const effectiveServiceLocation: 'mobile' | 'shop' = useShopAddress ? 'shop' : 'mobile'

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setBookingUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setBookingUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!bookingUser?.id || !slug) {
      setBookingProfile(null)
      return
    }
    let cancelled = false
    fetch(`/api/booking/me?slug=${encodeURIComponent(slug)}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.client) {
          setBookingProfile(data as BookingCustomerProfile)
          const addr = (data as BookingCustomerProfile).client?.address?.trim()
          if (addr) setAddressValue(addr)
        } else if (!cancelled) setBookingProfile(null)
      })
      .catch(() => {
        if (!cancelled) setBookingProfile(null)
      })
    return () => { cancelled = true }
  }, [bookingUser?.id, slug])

  const getOrCreateSessionToken = useCallback(() => {
    if (sessionTokenRef.current) return sessionTokenRef.current
    const key = `booking_session_${slug}`
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null
      const token = stored || crypto.randomUUID()
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, token)
      sessionTokenRef.current = token
      return token
    } catch {
      sessionTokenRef.current = crypto.randomUUID()
      return sessionTokenRef.current
    }
  }, [slug])

  useEffect(() => {
    const depositSuccess = searchParams.get('deposit_success') === '1'
    const cardSaved = searchParams.get('card_saved') === '1'
    const sessionToken = searchParams.get('session_token') ?? ''
    const stripeSessionId = searchParams.get('session_id') ?? ''
    if (depositSuccess) {
      setBookSuccess({
        serviceName: 'Deposit received — booking confirmed',
        scheduledAt: '',
        address: '',
        customerName: '',
      })
      if (stripeSessionId) {
        fetch('/api/booking/complete-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: stripeSessionId }),
        }).catch(() => {})
      }
      if (sessionToken && slug) {
        fetch('/api/booking/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, sessionToken, booked: true }),
        }).catch(() => {})
      }
      const url = new URL(window.location.href)
      url.searchParams.delete('deposit_success')
      url.searchParams.delete('session_id')
      url.searchParams.delete('session_token')
      window.history.replaceState({}, '', url.pathname + url.search)
    } else if (cardSaved) {
      setBookSuccess({
        serviceName: 'Card saved — booking confirmed',
        scheduledAt: '',
        address: '',
        customerName: '',
      })
      if (stripeSessionId) {
        fetch('/api/booking/complete-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: stripeSessionId }),
        }).catch(() => {})
      }
      if (sessionToken && slug) {
        fetch('/api/booking/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, sessionToken, booked: true }),
        }).catch(() => {})
      }
      const url = new URL(window.location.href)
      url.searchParams.delete('card_saved')
      url.searchParams.delete('session_id')
      url.searchParams.delete('session_token')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [searchParams, slug])

  useEffect(() => {
    const signinParam = searchParams.get('signin') === '1'
    if (signinParam) {
      setAuthModal('signin')
      setAuthModalMessage('Password updated. Please sign in with your new password.')
      const url = new URL(window.location.href)
      url.searchParams.delete('signin')
      const clean = url.search ? url.pathname + url.search : url.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [searchParams])

  const bookingStyle = useMemo(() => {
    const accent = (context.accentColor ?? context.primaryColor ?? BOOKING_ACCENT_DEFAULT).trim() || BOOKING_ACCENT_DEFAULT
    const bg = (context.primaryColor ?? '').trim() || BOOKING_BG_DEFAULT
    const isLight = isLightBackground(bg)
    const preset = isLight ? BOOKING_LIGHT_PRESET : BOOKING_DARK_PRESET
    const headerOverride = (context.bookingHeaderTextColor ?? '').trim()
    const bodyOverride = (context.bookingTextColor ?? '').trim()
    const useHeaderOverride =
      headerOverride &&
      (isLight ? !isLightBackground(headerOverride) : isLightBackground(headerOverride))
    const useBodyOverride =
      bodyOverride &&
      (isLight ? !isLightBackground(bodyOverride) : isLightBackground(bodyOverride))
    const cardBg = !isLight && bg ? lightenHex(bg, 0.18) : undefined
    const headerVar = useHeaderOverride ? { ['--booking-header-text']: headerOverride } : {}
    const bodyVars = useBodyOverride
      ? {
          ['--text']: bodyOverride,
          ['--text-1']: bodyOverride,
          ['--text-2']: bodyOverride,
          ['--text-3']: bodyOverride,
          ['--text-muted']: bodyOverride,
          ['--text-secondary']: bodyOverride,
        }
      : {}
    return {
      ['--accent']: accent,
      ['--booking-bg']: bg,
      background: bg,
      ...(cardBg ? { ['--booking-card-bg']: cardBg } : {}),
      ...preset,
      ...headerVar,
      ...bodyVars,
    } as unknown as React.CSSProperties
  }, [context.accentColor, context.primaryColor, context.theme, context.bookingTextColor, context.bookingHeaderTextColor])

  const mapCenter =
    context.mapLat != null && context.mapLng != null
      ? { lat: context.mapLat, lng: context.mapLng }
      : null

  const handlePlaceSelect = useCallback((place: { address: string; lat: number; lng: number }) => {
    setAddressError(null)
    const radiusKm = context.serviceRadiusKm != null && context.serviceRadiusKm > 0 ? context.serviceRadiusKm : null
    const centerLat = context.mapLat
    const centerLng = context.mapLng
    if (radiusKm != null && centerLat != null && centerLng != null) {
      const dist = haversineDistanceKm(centerLat, centerLng, place.lat, place.lng)
      if (dist > radiusKm) {
        setAddressError(`This address is outside our service area (${Math.round(dist)} km away; we serve within ${radiusKm} km).`)
        return
      }
    }
    setAddressValue(place.address)
    setMarkerPosition({ lat: place.lat, lng: place.lng })
    setPanelOpen(true)
  }, [context.serviceRadiusKm, context.mapLat, context.mapLng])

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

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    setBookingProfile(null)
  }, [supabase])

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden" style={bookingStyle}>
      <BookingHeader
        businessName={context.businessName}
        logoUrl={context.logoUrl}
        businessWebsite={context.website}
        serviceAreaLabel={context.serviceAreaLabel}
        bookingUser={bookingUser}
        profileLinkSlug={bookingUser && bookingProfile?.client ? slug : null}
        customerName={bookingProfile?.client?.name ?? null}
        onSignInClick={() => setAuthModal('signin')}
        onSignUpClick={() => setAuthModal('signup')}
        onSignOut={handleSignOut}
      />
      <BookingAuthModal
        open={authModal !== 'closed'}
        mode={authModal === 'signup' ? 'signup' : 'signin'}
        onClose={() => { setAuthModal('closed'); setAuthModalMessage(null) }}
        onSwitchMode={(m) => setAuthModal(m)}
        slug={slug}
        onSuccess={() => setAuthModal('closed')}
        bannerMessage={authModalMessage}
      />
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
            locationId={locationId}
            sessionToken={panelOpen ? getOrCreateSessionToken() : null}
            services={context.services}
            upsells={context.upsells ?? []}
            showPrices={context.showPrices}
            blackoutDates={context.blackoutDates ?? []}
            bookingPaymentMode={context.bookingPaymentMode ?? 'none'}
            mapReady={mapReady}
            initialAddress={useShopAddress && shopAddress ? shopAddress : addressValue}
            initialAddressLat={useShopAddress ? undefined : markerPosition?.lat}
            initialAddressLng={useShopAddress ? undefined : markerPosition?.lng}
            mapLat={context.mapLat ?? null}
            mapLng={context.mapLng ?? null}
            serviceAreaLabel={context.serviceAreaLabel ?? null}
            serviceLocation={effectiveServiceLocation}
            shopAddress={shopAddress}
            onBookSuccess={(data) => setBookSuccess(data)}
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            initialServiceId={maintenanceContext && context.services.some((s) => s.id === maintenanceContext.serviceId) ? maintenanceContext.serviceId : undefined}
            maintenanceDiscount={maintenanceContext?.discount}
            customerProfile={bookingProfile}
            onSignInClick={() => setAuthModal('signin')}
            onSignUpClick={() => setAuthModal('signup')}
          />
        </AnimatePresence>
      </div>

      {!panelOpen && (
        <div className="absolute top-24 left-0 right-0 flex justify-center pointer-events-none px-4 pb-4">
          <div className="pointer-events-auto w-full max-w-md mx-auto space-y-2">
            {maintenanceContext && (
              <p className="text-sm text-[var(--text-2)] text-center">
                Based on your recent <span className="font-medium text-[var(--text)]">{maintenanceContext.serviceName}</span>, book your next visit below.
                {maintenanceContext.discount && (
                  <span className="block mt-0.5 text-[var(--accent)]">
                    {maintenanceContext.discount.type === 'percent' ? `${maintenanceContext.discount.value}% off` : `$${maintenanceContext.discount.value} off`}
                  </span>
                )}
              </p>
            )}
            {isBoth && (
              <div
                className="w-full max-w-md mx-auto flex rounded-xl border border-[var(--border)] p-1.5 overflow-hidden"
                style={{
                  backgroundColor: 'var(--booking-card-bg, color-mix(in srgb, var(--booking-bg,#212121) 94%, transparent))',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 0 0 1px var(--border), 0 10px 25px -8px rgba(0,0,0,0.35)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setServiceLocation('mobile')}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${serviceLocation === 'mobile' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--booking-surface)]'}`}
                >
                  At my location
                </button>
                <button
                  type="button"
                  onClick={() => setServiceLocation('shop')}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${serviceLocation === 'shop' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--booking-surface)]'}`}
                >
                  At the shop
                </button>
              </div>
            )}
            {(isShopOnly || (isBoth && serviceLocation === 'shop')) ? (
              <div
                className="relative z-10 w-full max-w-md mx-auto rounded-2xl border border-[var(--border)] shadow-2xl p-6 overflow-hidden"
                style={{
                  backgroundColor: 'var(--booking-card-bg, color-mix(in srgb, var(--booking-bg,#212121) 94%, transparent))',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 0 0 1px var(--border), 0 25px 50px -12px rgba(0,0,0,0.35)',
                }}
              >
                <div className="flex flex-col items-center gap-3 mb-5">
                  {context.logoUrl && (
                    <img src={context.logoUrl} alt="" className="h-12 w-auto object-contain drop-shadow-sm" />
                  )}
                  <h1 className="text-xl font-semibold text-center tracking-tight" style={{ color: 'var(--booking-header-text, var(--text))' }}>
                    Book with {context.businessName}
                  </h1>
                  {context.tagline && (
                    <p className="text-sm text-[var(--text-muted)] text-center max-w-[85%]">{context.tagline}</p>
                  )}
                  <p className="text-sm font-medium text-[var(--text)]">Service at our shop</p>
                  {shopAddress && <p className="text-sm text-[var(--text-2)] text-center max-w-[90%]">{shopAddress}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Choose service & time
                </button>
                <div className="mt-4 pt-3 border-t border-[var(--border)] text-center text-[var(--text)] flex items-center justify-center">
                  {bookingUser && bookingProfile?.client ? (
                    <p className="text-sm">
                      <span className="text-[var(--text-2)]">Welcome, </span>
                      <Link href={`/book/${slug}/profile`} className="text-[var(--accent)] font-semibold underline underline-offset-2 hover:opacity-90">
                        {bookingProfile.client.name?.trim() || 'your profile'}
                      </Link>
                    </p>
                  ) : (
                    <p className="text-sm">
                      <span className="text-[var(--text-2)]">Already a customer? </span>
                      <button type="button" onClick={() => setAuthModal('signin')} className="text-[var(--accent)] font-semibold underline underline-offset-2 hover:opacity-90">
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <BookingSearchCard
                  businessName={context.businessName}
                  logoUrl={context.logoUrl}
                  tagline={context.tagline}
                  addressValue={addressValue}
                  onAddressChange={(v) => { setAddressValue(v); setAddressError(null) }}
                  onPlaceSelect={handlePlaceSelect}
                  mapReady={mapReady}
                  footer={
                    bookingUser && bookingProfile?.client ? (
                      <p className="text-sm">
                        <span className="text-[var(--text-2)]">Welcome, </span>
                        <Link
                          href={`/book/${slug}/profile`}
                          className="text-[var(--accent)] font-semibold underline underline-offset-2 hover:opacity-90"
                        >
                          {bookingProfile.client.name?.trim() || 'your profile'}
                        </Link>
                      </p>
                    ) : (
                      <p className="text-sm">
                        <span className="text-[var(--text-2)]">Already a customer? </span>
                        <button
                          type="button"
                          onClick={() => setAuthModal('signin')}
                          className="text-[var(--accent)] font-semibold underline underline-offset-2 hover:opacity-90"
                        >
                          Sign in
                        </button>
                      </p>
                    )
                  }
                />
                {addressError && (
                  <p className="text-sm text-red-500 text-center mt-1" role="alert">
                    {addressError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <BookingRouteSummary bookSuccess={bookSuccess} businessName={context.businessName} onClose={() => setBookSuccess(null)} />
    </div>
  )
}
