'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import type { BookingSuccessData } from './BookingPageClient'

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

export interface BookingService {
  id: string
  name: string
  duration_mins: number
  base_price: number
  description: string | null
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
  services: BookingService[]
  upsells: BookingUpsell[]
  showPrices: boolean
  blackoutDates: string[]
  /** When 'deposit' or 'card_on_file', payment is required at checkout (Pro only). */
  bookingPaymentMode?: BookingPaymentMode
  mapReady: boolean
  initialAddress: string
  onBookSuccess: (data: BookingSuccessData) => void
  open: boolean
  onClose?: () => void
  /** Pre-select this service when panel opens (e.g. from maintenance link). */
  initialServiceId?: string | null
  /** Applied when ref=maintenance; reduces total on booking page. */
  maintenanceDiscount?: { type: 'percent' | 'fixed'; value: number } | null
}

export function BookingServicePanel({
  slug,
  services,
  upsells,
  showPrices,
  blackoutDates,
  bookingPaymentMode = 'none',
  mapReady,
  initialAddress,
  onBookSuccess,
  open,
  onClose,
  initialServiceId,
  maintenanceDiscount,
}: BookingServicePanelProps) {
  const maintenancePreSelectRef = useRef(false)
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<BookingService | null>(null)
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null)
  const [selectedAddOns, setSelectedAddOns] = useState<BookingUpsell[]>([])
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [address, setAddress] = useState(initialAddress)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' })
  const [vehicle, setVehicle] = useState({ make: '', model: '', year: '', color: '' })
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    setAddress(initialAddress)
  }, [initialAddress])

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

  // Live price total (before discount)
  const subtotal =
    (selectedService?.base_price ?? 0) +
    (selectedSize?.price_offset ?? 0) +
    selectedAddOns.reduce((s, a) => s + Number(a.price), 0)
  const discountAmount =
    maintenanceDiscount && subtotal > 0
      ? maintenanceDiscount.type === 'percent'
        ? Math.min(subtotal * (maintenanceDiscount.value / 100), subtotal)
        : Math.min(maintenanceDiscount.value, subtotal)
      : 0
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
      const res = await fetch(`/api/booking/slots?${params}`)
      const data = await res.json().catch(() => ({}))
      setSlots(Array.isArray(data.slots) ? data.slots : [])
    } catch {
      setSlots([])
    }
    setLoadingSlots(false)
  }, [slug, selectedService])

  useEffect(() => {
    if (step !== 'datetime' || !date) return
    fetchSlots(date)
  }, [step, date, fetchSlots])

  useEffect(() => {
    if (step !== 'details' || !mapReady || !addressInputRef.current || !window.google?.maps?.places) return
    const input = addressInputRef.current
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['address'],
      fields: ['formatted_address', 'geometry'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const addr = place.formatted_address ?? ''
      if (addr) setAddress(addr)
    })
    autocompleteRef.current = autocomplete
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        try { window.google.maps.event.clearInstanceListeners(autocompleteRef.current) } catch (_) {}
      }
      autocompleteRef.current = null
    }
  }, [step, mapReady])

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
        serviceId: selectedService.id,
        scheduledAt: selectedSlot,
        address: address.trim(),
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
      }

      if (requiresDeposit) {
        const res = await fetch('/api/booking/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'Unable to start payment')
          setSubmitting(false)
          return
        }
        if (data.url) {
          window.location.href = data.url
          return
        }
        setError('No payment link received')
        setSubmitting(false)
        return
      }

      if (requiresCardOnFile) {
        setError('Card on file is coming soon. Please contact the business to book.')
        setSubmitting(false)
        return
      }

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

  const content = (
    <div className="w-full max-w-sm md:max-w-none p-4 overflow-y-auto h-full flex flex-col">
      {onClose && (
        <div className="md:hidden flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[var(--border-hi)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--booking-surface-hover)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Service selection ── */}
      {step === 'service' && (
        <>
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-3">Select a service</h2>
          {services.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No services available yet.</p>
          ) : (
            <ul className="space-y-2">
              {services.map((s, idx) => {
                const ownerImage = Array.isArray(s.photo_urls)
                  ? s.photo_urls.find((u) => isOwnerUploadedImage(u))
                  : null
                const imageUrl = ownerImage ?? null
                const isPopular = idx === 0
                return (
                  <li key={s.id} className="relative">
                    {isPopular && (
                      <span className="absolute -top-2 left-3 z-10 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white tracking-wide shadow">
                        Most Popular
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectedService(s); setSelectedSize(null); setStep('size') }}
                      className={`w-full text-left rounded-lg border p-3 pt-4 transition-colors hover:bg-[var(--booking-surface-hover)] text-[var(--text)] flex gap-3 items-start ${
                        isPopular ? 'border-[var(--accent)] bg-[var(--booking-surface)]' : 'border-[var(--border)] bg-[var(--booking-surface)]'
                      }`}
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
                          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{s.description}</p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
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
            <div className="border-t border-[var(--border)] pt-3 mb-3 flex flex-col gap-1">
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-[var(--accent)]">
                  <span>Discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(discountAmount)}</span>
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
        className="md:hidden fixed inset-0 z-50 flex flex-col bg-[var(--booking-bg,#212121)]"
      >
        {content}
      </motion.div>
    </>
  )
}
