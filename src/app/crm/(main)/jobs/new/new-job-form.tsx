'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimeInput } from '@/components/ui/date-picker'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import Link from 'next/link'
import { Plus, Search, ChevronDown, X } from 'lucide-react'
import type { Client } from '@/types/database'
import type { Vehicle } from '@/types/database'
import type { Service } from '@/types/database'

export function NewJobForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCustomer = searchParams.get('customer') ?? ''
  const preselectedScheduled = searchParams.get('scheduled') ?? ''
  const scheduledAtInitial = preselectedScheduled
    ? (preselectedScheduled.includes('T') ? preselectedScheduled.slice(0, 16) : `${preselectedScheduled}T09:00`)
    : ''

  const [customers, setCustomers] = useState<Client[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [suggestedLocation, setSuggestedLocation] = useState<{ location_id: string; location_name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitUpgradeUrl, setSubmitUpgradeUrl] = useState<string | null>(null)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const customerPickerRef = useRef<HTMLDivElement>(null)
  type SizeOption = { size_key: string; label: string; price_offset: number }
  const DEFAULT_SIZES: SizeOption[] = [
    { size_key: 'sedan', label: 'Sedan', price_offset: 0 },
    { size_key: 'suv_5', label: 'SUV 5-seat', price_offset: 20 },
    { size_key: 'suv_7', label: 'SUV 7-seat', price_offset: 30 },
    { size_key: 'truck', label: 'Truck', price_offset: 40 },
  ]
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>(DEFAULT_SIZES)
  /** Raw size rows (with service_id) for per-vehicle options based on selected services */
  const [sizePriceRows, setSizePriceRows] = useState<{ service_id: string; size_key: string; label: string; price_offset: number }[]>([])
  const [formData, setFormData] = useState({
    customer_id: preselectedCustomer,
    vehicle_ids: [] as string[],
    /** Per-vehicle service IDs: vehicle_id -> service_id[] so same service can be on multiple vehicles */
    vehicle_services: {} as Record<string, string[]>,
    /** Per-vehicle size price offset: vehicle_id -> size_price_offset */
    vehicle_sizes: {} as Record<string, number>,
    scheduled_at: scheduledAtInitial,
    address: '',
    notes: '',
    send_confirmation_email: true,
    /** Location: '' = auto from address, or location id for manual assign. */
    location_id: '',
  })
  const [useCustomBasePrice, setUseCustomBasePrice] = useState(false)
  const [customBasePriceInput, setCustomBasePriceInput] = useState('')
  const [discountDollarsInput, setDiscountDollarsInput] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const orgId = user
        ? (await supabase.from('profiles').select('org_id').eq('id', user.id).single()).data?.org_id ?? null
        : null
      if (cancelled) return
      const [custRes, svcRes] = await Promise.all([
        orgId ? supabase.from('clients').select('*').eq('org_id', orgId).order('name') : { data: [] },
        orgId ? supabase.from('services').select('*').eq('org_id', orgId).order('name') : { data: [] },
      ])
      if (cancelled) return
      setCustomers(custRes.data ?? [])
      setServices(svcRes.data ?? [])
      const serviceIds = (svcRes.data ?? []).map((s: { id: string }) => s.id)
      if (serviceIds.length > 0) {
        const { data: sizeRows } = await supabase
          .from('service_size_prices')
          .select('service_id, size_key, label, price_offset')
          .in('service_id', serviceIds)
        if (!cancelled && sizeRows && sizeRows.length > 0) {
          setSizePriceRows(sizeRows as { service_id: string; size_key: string; label: string; price_offset: number }[])
          const byKey = new Map<string, SizeOption>()
          ;(sizeRows as { size_key: string; label: string; price_offset: number }[]).forEach((r) => {
            const existing = byKey.get(r.size_key)
            const offset = Number(r.price_offset) || 0
            if (!existing || offset > (existing.price_offset ?? 0))
              byKey.set(r.size_key, { size_key: r.size_key, label: r.label, price_offset: offset })
          })
          setSizeOptions([...byKey.values()].sort((a, b) => a.price_offset - b.price_offset))
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLocations(Array.isArray(data) ? data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })) : []))
      .catch(() => setLocations([]))
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerPickerRef.current && !customerPickerRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false)
      }
    }
    if (customerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [customerDropdownOpen])

  useEffect(() => {
    const address = (formData.address || '').trim()
    if (!address || address.length < 5) {
      setSuggestedLocation(null)
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/jobs/suggest-location?address=${encodeURIComponent(address)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.location_id && data.location_name) {
            setSuggestedLocation({ location_id: data.location_id, location_name: data.location_name })
          } else {
            setSuggestedLocation(null)
          }
        })
        .catch(() => setSuggestedLocation(null))
    }, 600)
    return () => clearTimeout(t)
  }, [formData.address])

  useEffect(() => {
    if (!formData.customer_id) {
      setVehicles([])
      setFormData((prev) => ({ ...prev, vehicle_ids: [], address: '' }))
      return
    }
    const selected = customers.find((c) => c.id === formData.customer_id)
    const customerAddress = (selected as Client & { address?: string })?.address ?? ''
    const supabase = createClient()
    supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', formData.customer_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVehicles(data ?? [])
        setFormData((prev) => {
          const nextVs: Record<string, string[]> = {}
          const nextSizes: Record<string, number> = { ...prev.vehicle_sizes }
          prev.vehicle_ids.forEach((vid) => {
            if ((data ?? []).some((v: { id: string }) => v.id === vid)) {
              nextVs[vid] = prev.vehicle_services[vid] ?? []
              if (nextSizes[vid] === undefined) nextSizes[vid] = sizeOptions[0]?.price_offset ?? 0
            }
          })
          return {
            ...prev,
            vehicle_ids: prev.vehicle_ids.filter((vid) => (data ?? []).some((v: { id: string }) => v.id === vid)),
            vehicle_services: nextVs,
            vehicle_sizes: nextSizes,
            address: customerAddress || prev.address,
          }
        })
      })
  }, [formData.customer_id, customers])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSubmitError(null)
    setSubmitUpgradeUrl(null)
    const vehicleServices: { vehicle_id: string | null; service_id: string }[] = []
    if (formData.vehicle_ids.length > 0) {
      formData.vehicle_ids.forEach((vid) => {
        (formData.vehicle_services[vid] ?? []).forEach((sid) => {
          vehicleServices.push({ vehicle_id: vid, service_id: sid })
        })
      })
    }
    const catalogServiceTotal = vehicleServices.reduce((sum, l) => {
      const svc = services.find((s) => s.id === l.service_id) as { base_price?: number } | undefined
      return sum + (svc?.base_price ?? 0)
    }, 0)
    const discount_amount = Math.max(0, parseFloat(discountDollarsInput) || 0)
    const customBaseParsed = Math.max(0, parseFloat(customBasePriceInput) || 0)
    if (!formData.customer_id?.trim()) {
      setSubmitError('Please select a customer.')
      setLoading(false)
      return
    }
    if (!formData.scheduled_at?.trim()) {
      setSubmitError('Please enter date and time.')
      setLoading(false)
      return
    }
    const effectiveAddress = (formData.address || addressFromCustomer || '').trim()
    if (!effectiveAddress) {
      setSubmitError('Please enter or select a service address.')
      setLoading(false)
      return
    }
    const vehicle_sizes: Record<string, number> = {}
    formData.vehicle_ids.forEach((vid) => {
      const opts = getSizeOptionsForVehicle(vid)
      const stored = formData.vehicle_sizes[vid]
      const valid = typeof stored === 'number' && opts.some((o) => o.price_offset === stored)
      vehicle_sizes[vid] = valid ? stored : (opts[0]?.price_offset ?? 0)
    })
    const locationId =
      (formData.location_id && formData.location_id.trim()) ||
      suggestedLocation?.location_id ||
      undefined
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: formData.customer_id,
        vehicle_ids: formData.vehicle_ids.length ? formData.vehicle_ids : undefined,
        vehicle_services: vehicleServices.length > 0 ? vehicleServices : undefined,
        vehicle_sizes: Object.keys(vehicle_sizes).length > 0 ? vehicle_sizes : undefined,
        scheduled_at: formData.scheduled_at,
        address: effectiveAddress,
        notes: formData.notes.trim() || null,
        pricing_mode: useCustomBasePrice ? 'custom' : 'catalog',
        base_price: useCustomBasePrice ? customBaseParsed : catalogServiceTotal,
        discount_amount,
        ...(locationId !== undefined && { location_id: locationId }),
      }),
    })
    const data = await res.json()

    if (res.ok && data.id) {
      const jobId = data.id
      fetch(`/api/integrations/google/sync/job/${jobId}`, { method: 'POST' }).catch(() => {})
      fetch('/api/jobs/notify-new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          sendClientEmail: formData.send_confirmation_email,
          forceBusinessEmail: true,
        }),
      }).catch(() => {})
      window.location.href = crmPath(`/jobs?created=${jobId}`)
      return
    }

    setLoading(false)
    if (res.status === 403 && data.upgradeUrl) {
      setSubmitError(data.error || 'Job limit reached.')
      setSubmitUpgradeUrl(data.upgradeUrl)
      return
    }
    setSubmitError(data.error || 'Failed to create job')
  }

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id)
  const addressFromCustomer = (selectedCustomer as Client & { address?: string })?.address ?? ''
  const customerSearchLower = customerSearchQuery.trim().toLowerCase()
  const filteredCustomers = customerSearchLower
    ? customers.filter((c) => c.name.toLowerCase().includes(customerSearchLower))
    : customers

  const catalogServiceTotalDisplay = useMemo(() => {
    let t = 0
    formData.vehicle_ids.forEach((vid) => {
      (formData.vehicle_services[vid] ?? []).forEach((sid) => {
        const svc = services.find((s) => s.id === sid) as { base_price?: number } | undefined
        t += svc?.base_price ?? 0
      })
    })
    return t
  }, [formData.vehicle_ids, formData.vehicle_services, services])

  /** Size options for a vehicle based on its selected services; falls back to org-wide sizeOptions if none selected */
  function getSizeOptionsForVehicle(vid: string): SizeOption[] {
    const serviceIds = formData.vehicle_services[vid] ?? []
    if (serviceIds.length === 0) return sizeOptions
    const byKey = new Map<string, SizeOption>()
    sizePriceRows
      .filter((r) => serviceIds.includes(r.service_id))
      .forEach((r) => {
        const offset = Number(r.price_offset) || 0
        const existing = byKey.get(r.size_key)
        if (!existing || offset > (existing.price_offset ?? 0))
          byKey.set(r.size_key, { size_key: r.size_key, label: r.label, price_offset: offset })
      })
    const list = [...byKey.values()].sort((a, b) => a.price_offset - b.price_offset)
    return list.length > 0 ? list : sizeOptions
  }

  function getSizeOffsetForVehicle(vid: string): number {
    const vehicleSizeOptions = getSizeOptionsForVehicle(vid)
    const stored = formData.vehicle_sizes[vid]
    const valid = typeof stored === 'number' && vehicleSizeOptions.some((o) => o.price_offset === stored)
    return valid ? stored : (vehicleSizeOptions[0]?.price_offset ?? 0)
  }

  const sizeAddonDisplay = useMemo(
    () => formData.vehicle_ids.reduce((sum, vid) => sum + getSizeOffsetForVehicle(vid), 0),
    [formData.vehicle_ids, formData.vehicle_services, formData.vehicle_sizes, sizePriceRows, sizeOptions]
  )

  const effectiveServiceBaseDisplay = useCustomBasePrice
    ? Math.max(0, parseFloat(customBasePriceInput) || 0)
    : catalogServiceTotalDisplay
  const discountDisplay = Math.max(0, parseFloat(discountDollarsInput) || 0)
  const estimatedTotalDisplay = Math.max(0, effectiveServiceBaseDisplay + sizeAddonDisplay - discountDisplay)

  return (
    <>
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 card p-6">
      <div ref={customerPickerRef} className="relative">
        <div className="flex items-center justify-between gap-2 mb-1">
          <Label htmlFor="customer-picker">Customer *</Label>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href={crmPath('/customers?add=1')}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add new customer
            </Link>
          </Button>
        </div>
        <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-card)] focus-within:ring-2 focus-within:ring-[var(--accent)]/30 focus-within:border-[var(--accent)]">
          <Search className="h-4 w-4 shrink-0 self-center ml-3 text-[var(--text-muted)]" aria-hidden />
          <input
            id="customer-picker"
            type="text"
            value={customerDropdownOpen ? customerSearchQuery : (selectedCustomer?.name ?? '')}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value)
              setCustomerDropdownOpen(true)
              if (formData.customer_id) setFormData((prev) => ({ ...prev, customer_id: '' }))
            }}
            onFocus={() => setCustomerDropdownOpen(true)}
            placeholder="Search customers..."
            className="flex-1 min-w-0 h-10 bg-transparent px-2 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
            autoComplete="off"
          />
          {formData.customer_id ? (
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, customer_id: '' }))
                setCustomerSearchQuery('')
                setCustomerDropdownOpen(true)
              }}
              className="shrink-0 p-2 text-[var(--text-muted)] hover:text-[var(--text)]"
              aria-label="Clear customer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCustomerDropdownOpen((o) => !o)}
              className="shrink-0 p-2 text-[var(--text-muted)] hover:text-[var(--text)]"
              aria-label="Open customer list"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
        <input type="hidden" name="customer_id" value={formData.customer_id} />
        {customerDropdownOpen && (
          <ul
            className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg py-1"
            role="listbox"
          >
            {filteredCustomers.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)]">No customers match your search.</li>
            ) : (
              filteredCustomers.map((c) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={formData.customer_id === c.id}
                  className="px-3 py-2.5 text-sm text-[var(--text)] cursor-pointer hover:bg-[var(--accent)]/10 focus:bg-[var(--accent)]/10 focus:outline-none"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, customer_id: c.id }))
                    setCustomerSearchQuery('')
                    setCustomerDropdownOpen(false)
                  }}
                >
                  {c.name}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      <div>
        <Label>Vehicles</Label>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-2">Select one or more, then choose services per vehicle below.</p>
        <div className="max-h-32 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2 space-y-1.5">
          {vehicles.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-1">No vehicles for this customer. Add vehicles in the customer profile.</p>
          ) : (
            vehicles.map((v) => (
              <label key={v.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={formData.vehicle_ids.includes(v.id)}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      vehicle_ids: e.target.checked
                        ? [...prev.vehicle_ids, v.id]
                        : prev.vehicle_ids.filter((id) => id !== v.id),
                      vehicle_services: e.target.checked
                        ? { ...prev.vehicle_services, [v.id]: prev.vehicle_services[v.id] ?? [] }
                        : (() => { const next = { ...prev.vehicle_services }; delete next[v.id]; return next })(),
                      vehicle_sizes: e.target.checked
                        ? { ...prev.vehicle_sizes, [v.id]: prev.vehicle_sizes[v.id] ?? sizeOptions[0]?.price_offset ?? 0 }
                        : (() => { const next = { ...prev.vehicle_sizes }; delete next[v.id]; return next })(),
                    }))
                  }}
                  className="rounded border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text)]">
                  {v.year ? `${v.year} ` : ''}{v.make} {v.model}
                  {v.color ? ` · ${v.color}` : ''}
                </span>
              </label>
            ))
          )}
        </div>
      </div>
      {formData.vehicle_ids.length > 0 && services.length > 0 && (
        <div className="space-y-4">
          <Label>Services & size per vehicle</Label>
          <p className="text-xs text-[var(--text-muted)]">Add services from the dropdown for each vehicle, then set vehicle size.</p>
          {formData.vehicle_ids.map((vid) => {
            const v = vehicles.find((x) => x.id === vid)
            const serviceIds = formData.vehicle_services[vid] ?? []
            const vehicleSizeOptions = getSizeOptionsForVehicle(vid)
            const sizeOffset = formData.vehicle_sizes[vid] ?? vehicleSizeOptions[0]?.price_offset ?? 0
            const sizeOffsetValid = vehicleSizeOptions.some((o) => o.price_offset === sizeOffset)
            const displayOffset = sizeOffsetValid ? sizeOffset : (vehicleSizeOptions[0]?.price_offset ?? 0)
            return (
              <div key={vid} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 space-y-3">
                <p className="text-sm font-medium text-[var(--text)]">
                  {v ? `${v.year ? `${v.year} ` : ''}${v.make} ${v.model}` : 'Vehicle'}
                </p>
                <div>
                  <Label className="text-xs text-[var(--text-muted)]">Add service</Label>
                  <select
                    value=""
                    onChange={(e) => {
                      const sid = e.target.value
                      if (!sid) return
                      setFormData((prev) => ({
                        ...prev,
                        vehicle_services: {
                          ...prev.vehicle_services,
                          [vid]: [...(prev.vehicle_services[vid] ?? []), sid],
                        },
                      }))
                      e.target.value = ''
                    }}
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                  >
                    <option value="">Select a service to add</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{(s as { base_price?: number }).base_price != null && ` — $${Number((s as { base_price?: number }).base_price).toLocaleString()}`}
                      </option>
                    ))}
                  </select>
                </div>
                {serviceIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {serviceIds.map((sid) => {
                      const s = services.find((x) => x.id === sid)
                      return (
                        <span
                          key={`${vid}-${sid}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg)] border border-[var(--border)] pl-2 pr-1 py-1 text-sm"
                        >
                          {s?.name ?? sid}
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({
                              ...prev,
                              vehicle_services: {
                                ...prev.vehicle_services,
                                [vid]: (prev.vehicle_services[vid] ?? []).filter((id) => id !== sid),
                              },
                            }))}
                            className="rounded p-0.5 hover:bg-[var(--text-muted)]/20 text-[var(--text-muted)]"
                            aria-label="Remove service"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
                <div>
                  <Label className="text-xs text-[var(--text-muted)]">Vehicle size</Label>
                  <select
                    value={displayOffset}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      vehicle_sizes: { ...prev.vehicle_sizes, [vid]: Number(e.target.value) },
                    }))}
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                  >
                    {vehicleSizeOptions.map((opt) => (
                      <option key={opt.size_key} value={opt.price_offset}>
                        {opt.label}{opt.price_offset > 0 ? ` (+$${opt.price_offset})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div>
        <Label htmlFor="scheduled_at">Date & time *</Label>
        <DateTimeInput
          id="scheduled_at"
          required
          value={formData.scheduled_at}
          onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_at: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="address">Address *</Label>
        <AddressAutocomplete
          id="address"
          required
          value={formData.address || addressFromCustomer}
          onChange={(v) => setFormData((prev) => ({ ...prev, address: v }))}
          placeholder="Service address"
        />
      </div>
      {locations.length > 0 && (
        <div>
          <Label htmlFor="location_id">Location</Label>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-1">Auto-assigns from address when possible, or choose manually.</p>
          <select
            id="location_id"
            value={formData.location_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, location_id: e.target.value }))}
            className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="">Auto (from address)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          {formData.location_id === '' && suggestedLocation && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5">Suggested: <strong className="text-[var(--text)]">{suggestedLocation.location_name}</strong></p>
          )}
        </div>
      )}
      {formData.vehicle_ids.length > 0 && (catalogServiceTotalDisplay > 0 || sizeAddonDisplay > 0) && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
          <p className="text-sm font-medium text-[var(--text)]">Pricing</p>
          <dl className="text-sm space-y-1 text-[var(--text-secondary)]">
            <div className="flex justify-between gap-2">
              <dt>Services (catalog)</dt>
              <dd className="text-[var(--text)]">${catalogServiceTotalDisplay.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Size add-on</dt>
              <dd className="text-[var(--text)]">${sizeAddonDisplay.toLocaleString()}</dd>
            </div>
          </dl>
          <label className="flex items-start gap-2 cursor-pointer text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={useCustomBasePrice}
              onChange={(e) => {
                const on = e.target.checked
                setUseCustomBasePrice(on)
                if (on)
                  setCustomBasePriceInput((prev) => (prev.trim() !== '' ? prev : String(catalogServiceTotalDisplay)))
              }}
              className="mt-1 rounded border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent)]"
            />
            <span>Use custom service price (overrides catalog service total; size add-on still applies)</span>
          </label>
          {useCustomBasePrice && (
            <div>
              <Label htmlFor="custom_base">Custom service total ($)</Label>
              <Input
                id="custom_base"
                type="number"
                min={0}
                step={0.01}
                value={customBasePriceInput}
                onChange={(e) => setCustomBasePriceInput(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="job_discount">Discount ($)</Label>
            <Input
              id="job_discount"
              type="number"
              min={0}
              step={0.01}
              value={discountDollarsInput}
              onChange={(e) => setDiscountDollarsInput(e.target.value)}
              className="mt-1"
              placeholder="0"
            />
          </div>
          <p className="text-sm font-medium text-[var(--text)] pt-1 border-t border-[var(--border)]">
            Estimated job total (before upsells): ${estimatedTotalDisplay.toLocaleString()}
          </p>
        </div>
      )}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </div>
      {selectedCustomer && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
          <input
            type="checkbox"
            id="send_confirmation_email"
            checked={formData.send_confirmation_email}
            onChange={(e) => setFormData((prev) => ({ ...prev, send_confirmation_email: e.target.checked }))}
            className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent)]"
          />
          <Label htmlFor="send_confirmation_email" className="cursor-pointer text-sm text-[var(--text)]">
            Send booking confirmation email to customer
          </Label>
          {!(selectedCustomer as Client & { email?: string }).email?.trim() && (
            <span className="text-xs text-[var(--text-muted)]">(Customer has no email on file)</span>
          )}
        </div>
      )}
      {(submitError || submitUpgradeUrl) && (
        <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-sm text-amber-200 space-y-2">
          {submitError && <p>{submitError}</p>}
          {submitUpgradeUrl && (
            <a href={submitUpgradeUrl} className="inline-block font-medium text-[var(--accent)] hover:underline">
              Upgrade to Pro
            </a>
          )}
        </div>
      )}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create job'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(crmPath('/jobs'))}>
          Cancel
        </Button>
      </div>
    </form>
    </>
  )
}
