'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Check, Plus, Minus } from 'lucide-react'
import type { BookingSuccessData } from './BookingPageClient'
import { LocationCard, type LocationCardLocation } from './LocationCard'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function CalendarGrid({
  selected,
  onSelect,
  minDateStr,
  isDateDisabled,
}: {
  selected: string
  onSelect: (dateStr: string) => void
  minDateStr: string
  isDateDisabled: (dateStr: string) => boolean
}) {
  const [view, setView] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const first = new Date(view.year, view.month, 1)
  const last = new Date(view.year, view.month + 1, 0)
  const startPad = first.getDay()
  const daysInMonth = last.getDate()
  const days: (string | null)[] = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push(dateStr)
  }
  const nextMonth = () => setView((v) => (v.month >= 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }))
  const prevMonth = () => setView((v) => (v.month <= 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }))

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="p-1 text-[var(--text-2)] hover:text-[var(--text)]">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-[var(--text)]">
          {new Date(view.year, view.month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={nextMonth} className="p-1 text-[var(--text-2)] hover:text-[var(--text)]">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[10px] text-[var(--text-muted)] py-0.5">
            {w}
          </div>
        ))}
        {days.map((dateStr, i) =>
          dateStr === null ? (
            <div key={`e-${i}`} />
          ) : (
            <button
              key={dateStr}
              type="button"
              disabled={isDateDisabled(dateStr)}
              onClick={() => onSelect(dateStr)}
              className={`rounded p-1.5 text-xs transition-colors ${
                selected === dateStr
                  ? 'bg-[var(--accent)] text-white'
                  : isDateDisabled(dateStr)
                    ? 'text-[var(--text-muted)] cursor-not-allowed opacity-60'
                    : 'text-[var(--text)] hover:bg-[var(--booking-surface-hover)]'
              }`}
            >
              {dateStr.slice(8, 10).replace(/^0/, '')}
            </button>
          )
        )}
      </div>
    </div>
  )
}

export interface SizeOption {
  size_key: string
  label: string
  price_offset: number
}

/** URLs that are template/stock placeholders - don't show until owner uploads their own image */
const TEMPLATE_IMAGE_PREFIXES = ['/images/stock/', '/images/icons/']

function isOwnerUploadedImage(url: string): boolean {
  return !TEMPLATE_IMAGE_PREFIXES.some((p) => url.startsWith(p))
}

/** First sentence or first maxLen chars for list summary. */
function descriptionSummary(desc: string | null, maxLen = 80): string {
  if (!desc || !desc.trim()) return ''
  const t = desc.trim()
  const firstSentence = t.split(/[.!?]/)[0]?.trim()
  if (firstSentence && firstSentence.length <= maxLen) return firstSentence
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen).trim() + '…'
}

export interface BookingService {
  id: string
  name: string
  duration_mins: number
  base_price: number
  description: string | null
  category?: string | null
  /** From service_categories.sort_order; used to order categories on booking (null/uncategorized last). */
  category_sort_order?: number | null
  sort_order?: number
  photo_urls?: string[]
  size_prices?: SizeOption[]
}

export interface BookingUpsell {
  id: string
  name: string
  price: number
  category: string
  icon_url?: string | null
  service_ids?: string[] | null
}

type Step = 'service' | 'size' | 'addons' | 'datetime' | 'details'

export type BookingPaymentMode = 'none' | 'deposit' | 'card_on_file'

interface BookingServicePanelProps {
  slug: string
  /** Multi-location (Pro): selected location id; sent to slots and booking/checkout APIs. */
  locationId?: string | null
  /** Token for abandoned-booking tracking; when null, session API is not called. */
  sessionToken?: string | null
  services: BookingService[]
  upsells: BookingUpsell[]
  showPrices: boolean
  blackoutDates: string[]
  /** When 'deposit' or 'card_on_file', payment is required at checkout (Pro only). */
  bookingPaymentMode?: BookingPaymentMode
  mapReady: boolean
  initialAddress: string
  /** Lat/lng of the address selected on the map (for service radius validation). */
  initialAddressLat?: number | null
  initialAddressLng?: number | null
  /** Org map center for distance/drive time from org to customer. */
  mapLat?: number | null
  mapLng?: number | null
  /** Label for "X min drive from [serviceAreaLabel]" (e.g. city name). */
  serviceAreaLabel?: string | null
  /** When 'shop', address is the shop address and details step shows it read-only. */
  serviceLocation?: 'mobile' | 'shop'
  /** Shop address when serviceLocation is 'shop' (display + submit). */
  shopAddress?: string | null
  onBookSuccess: (data: BookingSuccessData) => void
  open: boolean
  onClose?: () => void
  /** Pre-select this service when panel opens (e.g. from maintenance link). */
  initialServiceId?: string | null
  /** Applied when ref=maintenance; reduces total on booking page. */
  maintenanceDiscount?: { type: 'percent' | 'fixed'; value: number } | null
  /** When customer is signed in, profile for prefill and past services. */
  customerProfile?: {
    client: { id: string; name: string; email: string; phone: string; address: string }
    vehicles: { id: string; make: string; model: string; year: number | null; color: string }[]
    pastJobs: { id: string; scheduled_at: string; address: string; status: string; service_name: string | null }[]
  } | null
  /** When not signed in, show Create account / Sign in / Continue as guest on details step; these open auth or close panel. */
  onSignInClick?: () => void
  onSignUpClick?: () => void
  /** Multi-location: show "Choose location" in panel after address is entered (not on first page). */
  locations?: LocationCardLocation[]
  onSelectLocation?: (locationId: string) => void
  /** Multi-location: true while loading location context after user picked a location. */
  contextLoading?: boolean
}

export function BookingServicePanel({
  slug,
  locationId = null,
  sessionToken = null,
  services,
  upsells,
  showPrices,
  blackoutDates,
  bookingPaymentMode = 'none',
  mapReady,
  initialAddress,
  initialAddressLat,
  initialAddressLng,
  mapLat,
  mapLng,
  serviceAreaLabel,
  serviceLocation = 'mobile',
  shopAddress = null,
  onBookSuccess,
  open,
  onClose,
  initialServiceId,
  maintenanceDiscount,
  customerProfile,
  onSignInClick,
  onSignUpClick,
  locations = undefined,
  onSelectLocation,
  contextLoading = false,
}: BookingServicePanelProps) {
  const isShopService = serviceLocation === 'shop'
  const maintenancePreSelectRef = useRef(false)
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<BookingService | null>(null)
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null)
  const [selectedAddOns, setSelectedAddOns] = useState<BookingUpsell[]>([])
  /** Service shown in the detail modal (full description + add-ons). When set, modal is open. */
  const [serviceDetailService, setServiceDetailService] = useState<BookingService | null>(null)
  /** Add-ons selected inside the service detail modal (applied on Confirm). */
  const [modalAddOns, setModalAddOns] = useState<BookingUpsell[]>([])
  /** Whether "View all add-ons" is expanded in the service detail modal. */
  const [modalAddOnsExpanded, setModalAddOnsExpanded] = useState(false)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [address, setAddress] = useState(initialAddress)
  const [addressLat, setAddressLat] = useState<number | null>(initialAddressLat ?? null)
  const [addressLng, setAddressLng] = useState<number | null>(initialAddressLng ?? null)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' })
  const [vehicle, setVehicle] = useState({ make: '', model: '', year: '', color: '' })
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [distanceResult, setDistanceResult] = useState<{ distanceKm: number; durationMins: number } | null>(null)
  const [selectedSavedVehicleId, setSelectedSavedVehicleId] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{
    promoCodeId: string
    name: string
    discountType: 'percent' | 'fixed'
    discountValue: number
  } | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const lastSessionPayloadRef = useRef<{ slug: string; sessionToken: string; stepReached: Step; address?: string; serviceId?: string; name?: string; email?: string; phone?: string; booked?: boolean } | null>(null)
  const hasLoadedSavedContactRef = useRef(false)

  const BOOKING_STORAGE_KEY = slug ? `booking_contact_${slug}` : ''

  useEffect(() => {
    if (!open || !BOOKING_STORAGE_KEY) return
    hasLoadedSavedContactRef.current = true
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BOOKING_STORAGE_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; email?: string; phone?: string; address?: string } | null
        if (parsed && typeof parsed === 'object') {
          setCustomer((c) => ({
            name: typeof parsed.name === 'string' ? parsed.name.trim() : c.name,
            email: typeof parsed.email === 'string' ? parsed.email.trim() : c.email,
            phone: typeof parsed.phone === 'string' ? parsed.phone.trim() : c.phone,
          }))
          if (typeof parsed.address === 'string' && parsed.address.trim()) setAddress(parsed.address.trim())
        }
      }
    } catch (_) {
      // ignore invalid stored data
    }
  }, [open, BOOKING_STORAGE_KEY])

  useEffect(() => {
    if (!open) {
      hasLoadedSavedContactRef.current = false
      setShowLocationPicker(false)
      setAppliedPromo(null)
      setPromoCodeInput('')
      setPromoError(null)
    }
  }, [open])

  const trackBookingSession = useCallback(
    async (payload: {
      stepReached: Step
      address?: string
      serviceId?: string | null
      name?: string
      email?: string
      phone?: string
      booked?: boolean
    }) => {
      if (!sessionToken || !slug) return
      const body = {
        slug,
        sessionToken,
        stepReached: payload.stepReached,
        address: payload.address ?? undefined,
        serviceId: payload.serviceId ?? undefined,
        name: payload.name ?? undefined,
        email: payload.email ?? undefined,
        phone: payload.phone ?? undefined,
        booked: payload.booked ?? false,
      }
      lastSessionPayloadRef.current = { ...body, stepReached: payload.stepReached }
      try {
        await fetch('/api/booking/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch {
        // fire-and-forget; don't block UX
      }
    },
    [slug, sessionToken]
  )

  useEffect(() => {
    if (!open || !sessionToken) return
    trackBookingSession({ stepReached: 'service', address: initialAddress || undefined })
  }, [open, sessionToken, initialAddress, trackBookingSession])

  useEffect(() => {
    if (!open || !sessionToken) return
    trackBookingSession({
      stepReached: step,
      address: address || undefined,
      serviceId: selectedService?.id ?? undefined,
      name: step === 'details' ? customer.name || undefined : undefined,
      email: step === 'details' ? customer.email || undefined : undefined,
      phone: step === 'details' ? customer.phone || undefined : undefined,
    })
  }, [open, sessionToken, step, address, selectedService?.id, customer.name, customer.email, customer.phone, trackBookingSession])

  useEffect(() => {
    setAddress(initialAddress)
    if (initialAddressLat != null && initialAddressLng != null) {
      setAddressLat(initialAddressLat)
      setAddressLng(initialAddressLng)
    }
  }, [initialAddress, initialAddressLat, initialAddressLng])

  useEffect(() => {
    if (!open || !customerProfile) return
    const c = customerProfile.client
    setCustomer((prev) => ({
      name: c.name || prev.name,
      email: c.email || prev.email,
      phone: c.phone || prev.phone,
    }))
    if (c.address?.trim() && !initialAddress?.trim()) setAddress(c.address.trim())
    const v = customerProfile.vehicles[0]
    if (v) {
      setSelectedSavedVehicleId(v.id)
      setVehicle({
        make: v.make || '',
        model: v.model || '',
        year: v.year != null ? String(v.year) : '',
        color: v.color || '',
      })
    } else {
      setSelectedSavedVehicleId(null)
    }
  }, [open, customerProfile, initialAddress])

  useEffect(() => {
    if (!open || !sessionToken || !slug) return
    const onHide = () => {
      const payload = {
        slug,
        sessionToken,
        stepReached: step,
        address: address || undefined,
        serviceId: selectedService?.id ?? undefined,
        name: step === 'details' ? customer.name || undefined : undefined,
        email: step === 'details' ? customer.email || undefined : undefined,
        phone: step === 'details' ? customer.phone || undefined : undefined,
        booked: false,
      }
      const body = JSON.stringify({
        ...payload,
        stepReached: payload.stepReached,
        address: payload.address ?? undefined,
        serviceId: payload.serviceId ?? undefined,
        name: payload.name ?? undefined,
        email: payload.email ?? undefined,
        phone: payload.phone ?? undefined,
        booked: false,
      })
      navigator.sendBeacon?.('/api/booking/session', new Blob([body], { type: 'application/json' }))
    }
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') onHide() }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [open, sessionToken, slug, step, address, selectedService?.id, customer.name, customer.email, customer.phone])

  // Pre-select service from maintenance link (once)
  useEffect(() => {
    if (!open || maintenancePreSelectRef.current || !initialServiceId || services.length === 0) return
    const svc = services.find((s) => s.id === initialServiceId)
    if (svc) {
      maintenancePreSelectRef.current = true
      setSelectedService(svc)
      setStep('size')
    }
  }, [open, initialServiceId, services])

  const sizes = selectedService?.size_prices ?? []
  const hasSizes = sizes.length > 0

  // Filter upsells to those applicable for the selected service
  const visibleUpsells = upsells.filter(
    (u) => !u.service_ids || u.service_ids.length === 0 || (selectedService && u.service_ids.includes(selectedService.id))
  )
  // Upsells applicable to the service shown in the detail modal
  const modalVisibleUpsells = upsells.filter(
    (u) =>
      !u.service_ids ||
      u.service_ids.length === 0 ||
      (serviceDetailService && u.service_ids.includes(serviceDetailService.id))
  )
  const toggleModalAddOn = (up: BookingUpsell) => {
    setModalAddOns((prev) => (prev.some((a) => a.id === up.id) ? prev.filter((a) => a.id !== up.id) : [...prev, up]))
  }

  // Live price total (before discount)
  const subtotal =
    (selectedService?.base_price ?? 0) +
    (selectedSize?.price_offset ?? 0) +
    selectedAddOns.reduce((s, a) => s + Number(a.price), 0)
  const maintenanceDiscountAmount =
    maintenanceDiscount && subtotal > 0
      ? maintenanceDiscount.type === 'percent'
        ? Math.min(subtotal * (maintenanceDiscount.value / 100), subtotal)
        : Math.min(maintenanceDiscount.value, subtotal)
      : 0
  const promoDiscountAmount =
    appliedPromo && subtotal > 0
      ? appliedPromo.discountType === 'percent'
        ? Math.min(subtotal * (appliedPromo.discountValue / 100), subtotal)
        : Math.min(appliedPromo.discountValue, subtotal)
      : 0
  const discountAmount = maintenanceDiscountAmount + promoDiscountAmount
  const totalPrice = Math.max(0, subtotal - discountAmount)

  const fetchSlots = useCallback(async (dateStr: string) => {
    if (!dateStr || !selectedService || dateStr.length !== 10) {
      setSlots([])
      setSelectedSlot('')
      return
    }
    setLoadingSlots(true)
    setSelectedSlot('')
    try {
      const params = new URLSearchParams({
        slug,
        date: dateStr,
        durationMins: String(selectedService.duration_mins),
      })
      if (locationId) params.set('locationId', locationId)
      const res = await fetch(`/api/booking/slots?${params}`)
      const data = await res.json().catch(() => ({}))
      setSlots(Array.isArray(data.slots) ? data.slots : [])
    } catch {
      setSlots([])
    }
    setLoadingSlots(false)
  }, [slug, locationId, selectedService])

  useEffect(() => {
    if (step !== 'datetime' || !date) return
    fetchSlots(date)
  }, [step, date, fetchSlots])

  useEffect(() => {
    if (
      addressLat == null ||
      addressLng == null ||
      mapLat == null ||
      mapLng == null
    ) {
      setDistanceResult(null)
      return
    }
    let cancelled = false
    const params = new URLSearchParams({
      fromLat: String(mapLat),
      fromLng: String(mapLng),
      toLat: String(addressLat),
      toLng: String(addressLng),
    })
    fetch(`/api/booking/distance?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (typeof data.distanceKm === 'number' && typeof data.durationMins === 'number') {
          setDistanceResult({ distanceKm: data.distanceKm, durationMins: data.durationMins })
        } else {
          setDistanceResult(null)
        }
      })
      .catch(() => {
        if (!cancelled) setDistanceResult(null)
      })
    return () => {
      cancelled = true
    }
  }, [addressLat, addressLng, mapLat, mapLng])

  useEffect(() => {
    if (step !== 'details' || isShopService || !mapReady || !addressInputRef.current || !window.google?.maps?.places) return
    const input = addressInputRef.current
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['address'],
      fields: ['formatted_address', 'geometry'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const addr = place.formatted_address ?? ''
      if (addr) setAddress(addr)
      const loc = place.geometry?.location
      if (loc) {
        setAddressLat(loc.lat())
        setAddressLng(loc.lng())
      }
    })
    autocompleteRef.current = autocomplete
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        try { window.google.maps.event.clearInstanceListeners(autocompleteRef.current) } catch (_) {}
      }
      autocompleteRef.current = null
    }
  }, [step, isShopService, mapReady])

  const minDate = new Date()
  minDate.setHours(0, 0, 0, 0)
  const minDateStr = minDate.toISOString().slice(0, 10)

  const isDateDisabled = (dateStr: string) => {
    if (dateStr < minDateStr) return true
    return blackoutDates.includes(dateStr)
  }

  const handleContinueFromSize = () => setStep('addons')
  const handleAddOnContinue = () => { setDate(''); setSelectedSlot(''); setStep('datetime') }
  const toggleAddOn = (up: BookingUpsell) => {
    setSelectedAddOns((prev) =>
      prev.some((a) => a.id === up.id) ? prev.filter((a) => a.id !== up.id) : [...prev, up]
    )
  }
  const handleBackFromDatetime = () => setStep('addons')
  const handleBackFromAddons = () => { setStep(hasSizes ? 'size' : 'service'); if (!hasSizes) setSelectedService(null) }
  const handleBackFromDetails = () => setStep('datetime')

  const canGoToDetails = date && selectedSlot
  const canSubmit = address.trim() && date && selectedSlot && customer.name.trim() && vehicle.make.trim() && vehicle.model.trim()
  const requiresDeposit = bookingPaymentMode === 'deposit'
  const requiresCardOnFile = bookingPaymentMode === 'card_on_file'

  async function handleSubmit() {
    if (!selectedService || !canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      if (BOOKING_STORAGE_KEY) {
        try {
          localStorage.setItem(
            BOOKING_STORAGE_KEY,
            JSON.stringify({
              name: customer.name.trim(),
              email: customer.email.trim() || '',
              phone: customer.phone.trim() || '',
              address: address.trim(),
            })
          )
        } catch (_) {
          // ignore quota or disabled localStorage
        }
      }

      const vehiclePayload =
        vehicle.make.trim() || vehicle.model.trim()
          ? {
              make: vehicle.make.trim() || undefined,
              model: vehicle.model.trim() || undefined,
              year: vehicle.year.trim() ? parseInt(vehicle.year.trim(), 10) : undefined,
              color: vehicle.color.trim() || undefined,
            }
          : undefined

      const bookingPayload = {
        slug,
        ...(locationId ? { locationId } : {}),
        serviceId: selectedService.id,
        scheduledAt: selectedSlot,
        address: address.trim(),
        addressLat: addressLat != null ? addressLat : undefined,
        addressLng: addressLng != null ? addressLng : undefined,
        serviceLocation: isShopService ? 'shop' as const : 'mobile' as const,
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim() || undefined,
          phone: customer.phone.trim() || undefined,
        },
        vehicle: vehiclePayload,
        notes: notes.trim() || undefined,
        sizeKey: selectedSize?.size_key,
        basePrice: selectedService.base_price,
        sizePriceOffset: selectedSize?.price_offset ?? 0,
        upsells: selectedAddOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        promoCodeId: appliedPromo?.promoCodeId,
      }

      if (requiresDeposit || requiresCardOnFile) {
        const res = await fetch('/api/booking/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...bookingPayload, sessionToken: sessionToken || undefined }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'Unable to start checkout')
          setSubmitting(false)
          return
        }
        if (data.url) {
          window.location.href = data.url
          return
        }
        setError('No checkout link received')
        setSubmitting(false)
        return
      }

      // Book now (no deposit, no card-on-file)
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Booking failed')
        setSubmitting(false)
        return
      }
      await trackBookingSession({ stepReached: 'details', booked: true, address: address.trim(), serviceId: selectedService.id, name: customer.name.trim(), email: customer.email.trim() || undefined, phone: customer.phone.trim() || undefined })
      onBookSuccess({
        serviceName: selectedService.name,
        scheduledAt: selectedSlot,
        address: address.trim(),
        customerName: customer.name.trim(),
      })
    } catch {
      setError('Something went wrong')
    }
    setSubmitting(false)
  }

  if (!open) return null

  const hasLocationFeature = locations != null && locations.length > 0 && onSelectLocation != null
  const selectedLocationName = locationId && locations?.length ? (locations.find((l) => l.id === locationId)?.name ?? null) : null

  const content = (
    <div className="w-full max-w-sm md:max-w-none mx-auto md:mx-0 p-4 overflow-y-auto h-full flex flex-col">
      {/* Top row: location (when multi-location) + close button on mobile */}
      <div className="flex items-center justify-between gap-2 mb-3 min-h-[44px]">
        <div className="flex-1 min-w-0">
          {hasLocationFeature && (
            contextLoading ? (
              <span className="text-sm text-[var(--text-2)]">Loading your location…</span>
            ) : (
              <span className="text-sm text-[var(--text)]">
                {selectedLocationName ? (
                  <>
                    {selectedLocationName}
                    {' · '}
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker((v) => !v)}
                      className="text-[var(--accent)] underline hover:no-underline"
                    >
                      Change location
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="text-[var(--accent)] underline hover:no-underline"
                  >
                    Choose location
                  </button>
                )}
              </span>
            )
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--border-hi)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--booking-surface-hover)]"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {/* Location list: only when user clicks Change/Choose location */}
      {hasLocationFeature && showLocationPicker && !contextLoading && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--booking-surface)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-sm font-medium text-[var(--text)]">Select location</p>
            <button
              type="button"
              onClick={() => setShowLocationPicker(false)}
              className="shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--booking-surface-hover)]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {locations!.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                selected={loc.id === locationId}
                onSelect={() => {
                  onSelectLocation!(loc.id)
                  setShowLocationPicker(false)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sign-in / guest */}
      {step === 'service' && !customerProfile && (onSignInClick != null || onSignUpClick != null) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--booking-surface)]">
          <span className="text-xs text-[var(--text-muted)] w-full">Sign in to auto-fill your details later</span>
          {onSignUpClick && (
            <Button type="button" variant="outline" size="sm" className="border-[var(--border-hi)] text-[var(--text)]" onClick={onSignUpClick}>
              Create account
            </Button>
          )}
          {onSignInClick && (
            <Button type="button" variant="outline" size="sm" className="border-[var(--border-hi)] text-[var(--text)]" onClick={onSignInClick}>
              Sign in
            </Button>
          )}
          <span className="text-xs text-[var(--text-muted)]">or continue as guest</span>
        </div>
      )}

      {/* ── Service selection (grouped by category) ── */}
      {step === 'service' && (
        <>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Select a service</h2>
          {services.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No services available yet.</p>
          ) : (
            <div className="space-y-6">
              {(() => {
                const byCategory = services.reduce<Record<string, BookingService[]>>((acc, s) => {
                  const catKey = s.category?.trim() || ''
                  if (!acc[catKey]) acc[catKey] = []
                  acc[catKey].push(s)
                  return acc
                }, {})
                // Order categories by service_categories.sort_order (same as CRM); uncategorized last.
                const categoryOrder = (() => {
                  const orderByCat = new Map<string, number>()
                  services.forEach((s) => {
                    const cat = s.category?.trim() || ''
                    if (!orderByCat.has(cat)) orderByCat.set(cat, s.category_sort_order ?? 999999)
                  })
                  return [...orderByCat.entries()].sort((a, b) => a[1] - b[1]).map(([c]) => c)
                })()
                return categoryOrder.map((catKey) => (
                  <div key={catKey || '__none__'}>
                    {catKey && (
                      <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        {catKey}
                      </h3>
                    )}
                    <ul className="space-y-2">
                      {(byCategory[catKey] ?? []).map((s, idx) => {
                        const ownerImage = Array.isArray(s.photo_urls)
                          ? s.photo_urls.find((u) => isOwnerUploadedImage(u))
                          : null
                        const imageUrl = ownerImage ?? null
                        const isPopular = !catKey && idx === 0
                        return (
                          <li key={s.id} className="relative">
                            {isPopular && (
                              <span className="absolute -top-2 left-3 z-10 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white tracking-wide shadow">
                                Most Popular
                              </span>
                            )}
                            <div
                              className={`w-full text-left rounded-lg border p-3 pt-4 transition-colors hover:bg-[var(--booking-surface-hover)] text-[var(--text)] flex gap-3 items-start ${
                                isPopular ? 'border-[var(--accent)] bg-[var(--booking-surface)]' : 'border-[var(--border)] bg-[var(--booking-surface)]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setServiceDetailService(s)
                                  setModalAddOns(selectedService?.id === s.id ? [...selectedAddOns] : [])
                                }}
                                className="flex-1 min-w-0 flex gap-3 items-start text-left"
                              >
                                {imageUrl && (
                                  <img src={imageUrl} alt="" className="h-14 w-20 shrink-0 object-cover rounded border border-[var(--border)]" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{s.name}</div>
                                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-0.5">
                                    <span>{s.duration_mins} min</span>
                                    {showPrices && (
                                      <span className="font-semibold text-[var(--text)]">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(s.base_price)}
                                      </span>
                                    )}
                                  </div>
                                  {s.description && (
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{descriptionSummary(s.description)}</p>
                                  )}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setServiceDetailService(s)
                                  setModalAddOns(selectedService?.id === s.id ? [...selectedAddOns] : [])
                                }}
                                className="shrink-0 text-sm font-medium text-[var(--accent)] hover:underline"
                              >
                                View more
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              })()}
            </div>
          )}
        </>
      )}

      {/* ── Vehicle size ── */}
      {step === 'size' && selectedService && (
        <>
          <button
            type="button"
            onClick={() => { setSelectedSize(null); setSelectedService(null); setStep('service') }}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Change service
          </button>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-2">{selectedService.name}</h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">Choose your vehicle size</p>
          <ul className="space-y-2 mb-4">
            {sizes.map((size) => (
              <li key={size.size_key}>
                <button
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedSize?.size_key === size.size_key
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-white'
                      : 'border-[var(--border)] bg-[var(--booking-surface)] text-[var(--text)] hover:bg-[var(--booking-surface-hover)]'
                  }`}
                >
                  <span className="font-medium">{size.label}</span>
                  {showPrices && size.price_offset !== 0 && (
                    <span className="text-sm text-[var(--text-muted)] ml-2">
                      +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(size.price_offset)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Button onClick={handleContinueFromSize} className="w-full">Continue</Button>
        </>
      )}

      {/* ── Add-ons ── */}
      {step === 'addons' && selectedService && (
        <>
          <button
            type="button"
            onClick={handleBackFromAddons}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-white mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-1">Add-ons (optional)</h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">Enhance your detail — skip to continue.</p>
          {visibleUpsells.length === 0 ? (
            <p className="text-sm text-white/60 mb-4">No add-ons available.</p>
          ) : (
            <div className="mb-3 overflow-y-auto flex-1">
              {(() => {
                const byCategory = visibleUpsells.reduce<Record<string, BookingUpsell[]>>((acc, up) => {
                  const cat = up.category?.trim() || 'extras'
                  if (!acc[cat]) acc[cat] = []
                  acc[cat].push(up)
                  return acc
                }, {})
                return Object.keys(byCategory).sort().map((cat) => (
                  <div key={cat} className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 capitalize">{cat}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {byCategory[cat].map((up) => {
                        const checked = selectedAddOns.some((a) => a.id === up.id)
                        return (
                          <button
                            key={up.id}
                            type="button"
                            onClick={() => toggleAddOn(up)}
                            className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${
                              checked
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                : 'border-[var(--border)] bg-[var(--booking-surface)] hover:bg-[var(--booking-surface-hover)]'
                            }`}
                          >
                            {checked && (
                              <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]">
                                <Check className="h-3 w-3 text-white" />
                              </span>
                            )}
                            {up.icon_url ? (
                              <img src={up.icon_url} alt="" className="h-10 w-10 object-contain" />
                            ) : (
                              <span className="text-3xl leading-none">✨</span>
                            )}
                            <span className="font-semibold text-sm text-[var(--text)] leading-tight">{up.name}</span>
                            {showPrices && (
                              <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                                +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(up.price)}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
          {showPrices && (
            <div className="border-t border-[var(--border)] pt-3 mb-3 flex flex-col gap-2">
              {/* Promo code */}
              <div className="flex flex-col gap-1">
                {appliedPromo ? (
                  <div className="flex items-center justify-between text-sm text-[var(--accent)]">
                    <span>Promo: {appliedPromo.name}</span>
                    <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(promoDiscountAmount)}</span>
                    <button
                      type="button"
                      onClick={() => { setAppliedPromo(null); setPromoError(null); setPromoCodeInput(''); }}
                      className="text-xs underline hover:no-underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={promoCodeInput}
                      onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(null); }}
                      placeholder="Promo code"
                      className="flex-1 text-sm"
                      style={{ background: 'var(--booking-surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!promoCodeInput.trim() || promoLoading}
                      onClick={async () => {
                        const code = promoCodeInput.trim().toUpperCase()
                        if (!code || !slug) return
                        setPromoError(null)
                        setPromoLoading(true)
                        try {
                          const params = new URLSearchParams({ slug, code, subtotal: String(subtotal) })
                          if (customer.email?.trim()) params.set('email', customer.email.trim())
                          if (customer.phone?.trim()) params.set('phone', customer.phone.trim())
                          const res = await fetch(`/api/booking/validate-promo?${params.toString()}`)
                          const data = await res.json().catch(() => ({}))
                          if (data.valid && data.promoCodeId && (data.discountType === 'percent' || data.discountType === 'fixed')) {
                            setAppliedPromo({
                              promoCodeId: data.promoCodeId,
                              name: data.name || code,
                              discountType: data.discountType,
                              discountValue: Number(data.discountValue) || 0,
                            })
                          } else {
                            setPromoError((data.error as string) || 'Invalid code')
                          }
                        } catch {
                          setPromoError('Could not validate code')
                        } finally {
                          setPromoLoading(false)
                        }
                      }}
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      {promoLoading ? '…' : 'Apply'}
                    </Button>
                  </div>
                )}
                {promoError && <p className="text-xs text-red-400">{promoError}</p>}
              </div>
              {discountAmount > 0 && !appliedPromo && maintenanceDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-[var(--accent)]">
                  <span>Discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(discountAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && appliedPromo && maintenanceDiscountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-[var(--accent)]">
                  <span>Other discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(maintenanceDiscountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Total</span>
                <span className="text-lg font-bold text-[var(--text)]">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalPrice)}
                </span>
              </div>
            </div>
          )}
          <Button onClick={handleAddOnContinue} className="w-full">Continue to date &amp; time</Button>
        </>
      )}

      {/* ── Date & time ── */}
      {step === 'datetime' && selectedService && (
        <>
          <button
            type="button"
            onClick={handleBackFromDatetime}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-2">Choose date &amp; time</h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">{selectedService.name}{selectedSize ? ` · ${selectedSize.label}` : ''}</p>

          <Label className="text-[var(--text-2)] text-xs mb-1 block">Date</Label>
          <CalendarGrid selected={date} onSelect={setDate} minDateStr={minDateStr} isDateDisabled={isDateDisabled} />

          <Label className="text-[var(--text-2)] text-xs mb-1 block">Time</Label>
          {!date ? (
            <p className="text-sm text-[var(--text-muted)] mb-3">Select a date first.</p>
          ) : loadingSlots ? (
            <p className="text-sm text-[var(--text-muted)] mb-3">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] mb-3">No available times. Try another date.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border py-2 text-sm transition-colors ${
                    selectedSlot === slot
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-white'
                      : 'border-[var(--border)] bg-[var(--booking-surface)] text-[var(--text)] hover:bg-[var(--booking-surface-hover)]'
                  }`}
                >
                  {new Date(slot).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </button>
              ))}
            </div>
          )}

          <Button onClick={() => setStep('details')} disabled={!canGoToDetails} className="w-full">Next</Button>
        </>
      )}

      {/* ── Customer details ── */}
      {step === 'details' && selectedService && (
        <>
          <button
            type="button"
            onClick={handleBackFromDetails}
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-2">Your details</h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {new Date(selectedSlot).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>

          {!customerProfile && (onSignInClick != null || onSignUpClick != null) && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--booking-surface)]">
              <span className="text-xs text-[var(--text-muted)] w-full">Account options:</span>
              {onSignUpClick && (
                <Button type="button" variant="outline" size="sm" className="border-[var(--border-hi)] text-[var(--text)]" onClick={onSignUpClick}>
                  Create account
                </Button>
              )}
              {onSignInClick && (
                <Button type="button" variant="outline" size="sm" className="border-[var(--border-hi)] text-[var(--text)]" onClick={onSignInClick}>
                  Sign in
                </Button>
              )}
              <span className="text-xs text-[var(--text-muted)]">or continue as guest below</span>
            </div>
          )}

          {requiresDeposit && (
            <p className="text-sm text-[var(--accent)] mb-2">
              A deposit is required at checkout. You&apos;ll pay securely after you click the button below.
            </p>
          )}
          {requiresCardOnFile && (
            <p className="text-sm text-[var(--text-2)] mb-2">
              Your card will be saved at checkout for payment after the service.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="sidebar-address" className="text-[var(--text-2)] text-xs">Service address *</Label>
              {isShopService ? (
                <p id="sidebar-address" className="mt-1 flex min-h-10 w-full items-center rounded-lg border border-[var(--border-hi)] bg-[var(--booking-surface)] px-3 py-2 text-sm text-[var(--text)]">
                  {shopAddress?.trim() || address?.trim() || 'Shop location'}
                </p>
              ) : (
                <>
                  <input
                    ref={addressInputRef}
                    id="sidebar-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Start typing your address..."
                    autoComplete="off"
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border-hi)] bg-[var(--booking-surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                  {distanceResult && (
                    <p className="text-xs text-[var(--text-muted)] mt-1.5">
                      About {distanceResult.distanceKm.toFixed(1)} km, ~{distanceResult.durationMins} min drive
                      {serviceAreaLabel?.trim() ? ` from ${serviceAreaLabel.trim()}` : ''}.
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <Label htmlFor="sidebar-name" className="text-[var(--text-2)] text-xs">Your name *</Label>
              <Input id="sidebar-name" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Full name" required className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div>
              <Label htmlFor="sidebar-email" className="text-[var(--text-2)] text-xs">Email</Label>
              <Input id="sidebar-email" type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} placeholder="you@example.com" className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div>
              <Label htmlFor="sidebar-phone" className="text-[var(--text-2)] text-xs">Phone</Label>
              <Input id="sidebar-phone" type="tel" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="(555) 123-4567" className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div className="border-t border-[var(--border)] pt-3 mt-3">
              <p className="text-[var(--text-2)] text-xs font-medium mb-2">Your vehicle *</p>
              {customerProfile?.vehicles && customerProfile.vehicles.length > 0 && (
                <div className="mb-2">
                  <Label htmlFor="saved-vehicle" className="text-[var(--text-muted)] text-xs">Saved vehicles</Label>
                  <select
                    id="saved-vehicle"
                    value={selectedSavedVehicleId ?? '__add__'}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__add__') {
                        setSelectedSavedVehicleId(null)
                        setVehicle({ make: '', model: '', year: '', color: '' })
                      } else {
                        const v = customerProfile!.vehicles.find((x) => x.id === val)
                        if (v) {
                          setSelectedSavedVehicleId(v.id)
                          setVehicle({
                            make: v.make || '',
                            model: v.model || '',
                            year: v.year != null ? String(v.year) : '',
                            color: v.color || '',
                          })
                        }
                      }
                    }}
                    className="mt-0.5 flex h-9 w-full rounded-lg border border-[var(--border-hi)] bg-[var(--booking-surface)] px-3 py-1.5 text-sm text-[var(--text)]"
                  >
                    <option value="__add__">Add another vehicle</option>
                    {customerProfile.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {[v.make, v.model, v.year].filter(Boolean).join(' ')} {v.color ? `(${v.color})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="vehicle-make" className="text-[var(--text-muted)] text-xs">Make *</Label>
                  <Input id="vehicle-make" value={vehicle.make} onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))} placeholder="e.g. Honda" className="mt-0.5 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)] h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="vehicle-model" className="text-[var(--text-muted)] text-xs">Model *</Label>
                  <Input id="vehicle-model" value={vehicle.model} onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))} placeholder="e.g. Civic" className="mt-0.5 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)] h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="vehicle-year" className="text-[var(--text-muted)] text-xs">Year</Label>
                  <Input id="vehicle-year" type="text" inputMode="numeric" maxLength={4} value={vehicle.year} onChange={(e) => setVehicle((v) => ({ ...v, year: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="e.g. 2022" className="mt-0.5 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)] h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="vehicle-color" className="text-[var(--text-muted)] text-xs">Colour</Label>
                  <Input id="vehicle-color" value={vehicle.color} onChange={(e) => setVehicle((v) => ({ ...v, color: e.target.value }))} placeholder="e.g. Black" className="mt-0.5 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)] h-9 text-sm" />
                </div>
              </div>
            </div>
            {customerProfile?.pastJobs && customerProfile.pastJobs.length > 0 && (
              <div className="border-t border-[var(--border)] pt-3 mt-3">
                <p className="text-[var(--text-2)] text-xs font-medium mb-2">Past services</p>
                <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                  {customerProfile.pastJobs.slice(0, 10).map((job) => (
                    <li key={job.id} className="text-xs text-[var(--text-muted)]">
                      <span className="text-[var(--text)]">{job.service_name ?? 'Service'}</span>
                      {' — '}
                      {new Date(job.scheduled_at).toLocaleDateString(undefined, { dateStyle: 'short' })}
                      {job.address ? ` at ${job.address.slice(0, 40)}${job.address.length > 40 ? '…' : ''}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <Label htmlFor="sidebar-notes" className="text-[var(--text-2)] text-xs">Notes (optional)</Label>
              <Textarea id="sidebar-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Access instructions, special requests..." rows={2} className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]" />
            </div>
          </div>

          {/* Price summary before booking */}
          {showPrices && (selectedAddOns.length > 0 || discountAmount > 0) && (
            <div className="mt-4 rounded-lg border border-[var(--border)] p-3 space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>{selectedService.name}</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedService.base_price + (selectedSize?.price_offset ?? 0))}</span>
              </div>
              {selectedAddOns.map((a) => (
                <div key={a.id} className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>{a.name}</span>
                  <span>+{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(a.price)}</span>
                </div>
              ))}
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-[var(--accent)]">
                  <span>Discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[var(--text)] pt-1 border-t border-[var(--border)]">
                <span>Total</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalPrice)}</span>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full mt-4">
            {submitting ? 'Booking...' : requiresDeposit ? 'Pay deposit & book' : requiresCardOnFile ? 'Continue (card on file)' : 'Book now'}
          </Button>
        </>
      )}
    </div>
  )

  return (
    <>
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 380, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: 'tween', duration: 0.25 }}
        className="relative z-10 flex-shrink-0 overflow-hidden border-l border-[var(--border)] bg-[var(--booking-bg,#212121)] hidden md:block"
      >
        {content}
      </motion.aside>
      {/* Mobile: full-screen panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="md:hidden fixed inset-0 z-50 flex flex-col items-center bg-[var(--booking-bg,#212121)]"
      >
        {content}
      </motion.div>

      {/* Service detail modal: single solid black panel (org booking theme) */}
      <Dialog
        open={!!serviceDetailService}
        onOpenChange={(open) => { if (!open) { setServiceDetailService(null); setModalAddOnsExpanded(false) } }}
      >
        <DialogContent
          className="max-w-md text-[var(--text)] p-6 overflow-y-auto max-h-[90dvh] rounded-xl shadow-2xl border-0"
          style={{ background: 'var(--booking-bg, #212121)', border: 'none' } as React.CSSProperties}
        >
          <DialogClose
            onClick={() => setServiceDetailService(null)}
            className="text-[var(--text-muted)] hover:bg-[var(--booking-surface-hover)] hover:text-[var(--text)] focus:ring-[var(--accent)]"
          />
          {serviceDetailService && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[var(--text)]">{serviceDetailService.name}</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <span>{serviceDetailService.duration_mins} min</span>
                    {showPrices && (
                      <span className="font-semibold text-[var(--text)]">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(serviceDetailService.base_price)}
                      </span>
                    )}
                  </div>
                </DialogHeader>
                {serviceDetailService.description && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">What&apos;s included</div>
                    <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{serviceDetailService.description}</p>
                  </div>
                )}
                {modalVisibleUpsells.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Add-ons</div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--booking-surface)] divide-y divide-[var(--border)]">
                      {modalVisibleUpsells.slice(0, 3).map((up, idx) => {
                        const isAdded = modalAddOns.some((a) => a.id === up.id)
                        return (
                          <div key={up.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span className="shrink-0 rounded bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-semibold px-1.5 py-0.5">
                                Popular
                              </span>
                              <span className="text-[var(--text)] truncate">{up.name}</span>
                              {showPrices && (
                                <span className="text-[var(--text-muted)] shrink-0">
                                  +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(up.price))}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleModalAddOn(up)}
                              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                                isAdded
                                  ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                              }`}
                              title={isAdded ? 'Remove add-on' : 'Add add-on'}
                            >
                              {isAdded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )
                      })}
                      {modalVisibleUpsells.length > 3 && (
                        <>
                          {modalAddOnsExpanded ? (
                            modalVisibleUpsells.slice(3).map((up) => {
                              const isAdded = modalAddOns.some((a) => a.id === up.id)
                              return (
                                <div key={up.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    <span className="text-[var(--text)] truncate">{up.name}</span>
                                    {showPrices && (
                                      <span className="text-[var(--text-muted)] shrink-0">
                                        +{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(up.price))}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleModalAddOn(up)}
                                    className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                                      isAdded
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                                    }`}
                                    title={isAdded ? 'Remove add-on' : 'Add add-on'}
                                  >
                                    {isAdded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              )
                            })
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setModalAddOnsExpanded((e) => !e)}
                            className="w-full px-3 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--booking-surface-hover)] text-center border-t border-[var(--border)]"
                          >
                            {modalAddOnsExpanded ? 'Show less' : `View all add-ons (${modalVisibleUpsells.length - 3} more)`}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setServiceDetailService(null)}
                    className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--booking-surface-hover)]"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedService(serviceDetailService)
                      setSelectedAddOns([...modalAddOns])
                      setSelectedSize(null)
                      setServiceDetailService(null)
                      setModalAddOns([])
                      const nextSizes = serviceDetailService.size_prices ?? []
                      setStep(nextSizes.length > 0 ? 'size' : 'addons')
                    }}
                    className="bg-[var(--accent)] text-white hover:opacity-90"
                  >
                    Confirm service
                  </Button>
                </div>
              </>
            )}
        </DialogContent>
      </Dialog>
    </>
  )
}
