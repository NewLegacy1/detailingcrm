'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimeInput } from '@/components/ui/date-picker'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { MapPin, Loader2 } from 'lucide-react'
import type { Client } from '@/types/database'
import type { Vehicle } from '@/types/database'
import type { Service } from '@/types/database'

export type JobFull = {
  id: string
  customer_id: string
  vehicle_id: string | null
  service_id: string | null
  scheduled_at: string
  address: string
  status: string
  notes: string | null
  actual_started_at?: string | null
  actual_ended_at?: string | null
  clients: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null
  vehicles: { id: string; make: string; model: string; year: number | null; color: string | null } | { id: string; make: string; model: string; year: number | null; color: string | null }[] | null
  services: { id: string; name: string; duration_mins: number } | { id: string; name: string; duration_mins: number }[] | null
}

interface ScheduleJobDetailModalProps {
  /** When true, modal is visible. When false, modal is closed. */
  open: boolean
  /** Existing job to edit, or null for create mode */
  jobId: string | null
  /** Pre-fill scheduled_at when in create mode (e.g. "2025-02-26T09:00") */
  initialScheduledAt?: string
  /** Pre-fetched job data — when provided, skip fetch (avoids "Job not found" when opening from popup) */
  initialJobData?: JobFull | null
  onClose: () => void
  onSaved: () => void
}

export function ScheduleJobDetailModal({ open, jobId, initialScheduledAt, initialJobData, onClose, onSaved }: ScheduleJobDetailModalProps) {
  const [job, setJob] = useState<JobFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Client[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [suggestedLocation, setSuggestedLocation] = useState<{ location_id: string; location_name: string } | null>(null)
  type SizeOption = { size_key: string; label: string; price_offset: number }
  const DEFAULT_SIZES: SizeOption[] = [
    { size_key: 'sedan', label: 'Sedan', price_offset: 0 },
    { size_key: 'suv_5', label: 'SUV 5-seat', price_offset: 20 },
    { size_key: 'suv_7', label: 'SUV 7-seat', price_offset: 30 },
    { size_key: 'truck', label: 'Truck', price_offset: 40 },
  ]
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>(DEFAULT_SIZES)
  /** Raw size rows keyed by service for per-vehicle options (from selected services) */
  const [sizePriceRows, setSizePriceRows] = useState<{ service_id: string; size_key: string; label: string; price_offset: number }[]>([])
  const [form, setForm] = useState({
    customer_id: '',
    vehicle_ids: [] as string[],
    vehicle_services: {} as Record<string, string[]>,
    vehicle_sizes: {} as Record<string, number>,
    scheduled_at: '',
    address: '',
    status: 'scheduled',
    notes: '',
    send_confirmation_email: true,
    location_id: '',
  })

  const isCreate = open && !jobId

  useEffect(() => {
    if (!open) {
      setJob(null)
      setLoading(true)
      return
    }
    if (isCreate) {
      setJob(null)
      const defaultTime = initialScheduledAt || (() => {
        const d = new Date()
        d.setMinutes(0, 0, 0)
        if (d.getHours() < 9) d.setHours(9, 0, 0, 0)
        return d.toISOString().slice(0, 16)
      })()
      setForm((prev) => ({ ...prev, scheduled_at: defaultTime, status: 'scheduled' }))
      setLoading(false)
      return
    }
    if (!jobId) {
      setJob(null)
      setLoading(false)
      return
    }
    // When editing, always fetch job + job_vehicles + job_services so we get full vehicle/service lists
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      supabase.from('jobs').select(`
        id, customer_id, vehicle_id, service_id, scheduled_at, address, status, notes, size_price_offset, location_id,
        actual_started_at, actual_ended_at,
        clients(id, name, email, phone, address),
        vehicles(id, make, model, year, color),
        services(id, name, duration_mins)
      `).eq('id', jobId).single(),
      supabase.from('job_vehicles').select('vehicle_id, size_price_offset').eq('job_id', jobId),
      supabase.from('job_services').select('service_id, vehicle_id').eq('job_id', jobId),
    ]).then(([jobRes, jvRes, jsRes]) => {
      if (jobRes.error || !jobRes.data) {
        setJob(null)
        setLoading(false)
        return
      }
      const jobData = jobRes.data as unknown as JobFull
      const jvRows = (jvRes.data ?? []) as { vehicle_id: string; size_price_offset?: number }[]
      const vehicleIds = jvRows.map((r) => r.vehicle_id)
      const vehicle_sizes: Record<string, number> = {}
      jvRows.forEach((r) => {
        vehicle_sizes[r.vehicle_id] = typeof r.size_price_offset === 'number' ? r.size_price_offset : 0
      })
      const jsRows = (jsRes.data ?? []) as { service_id: string; vehicle_id: string | null }[]
      const firstVid = vehicleIds[0] ?? (jobData.vehicle_id ?? null)
      const vehicle_services: Record<string, string[]> = {}
      vehicleIds.forEach((vid) => { vehicle_services[vid] = []; if (vehicle_sizes[vid] === undefined) vehicle_sizes[vid] = 0 })
      jsRows.forEach((r) => {
        const vid = r.vehicle_id ?? firstVid ?? '__job__'
        if (!vehicle_services[vid]) vehicle_services[vid] = []
        vehicle_services[vid].push(r.service_id)
      })
      if (firstVid && !vehicleIds.length) vehicle_services[firstVid] = vehicle_services['__job__'] ?? []
      delete vehicle_services['__job__']
      setJob(jobData)
      const d = new Date(jobData.scheduled_at)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
      setForm({
        customer_id: jobData.customer_id,
        vehicle_ids: vehicleIds.length > 0 ? vehicleIds : (jobData.vehicle_id ? [jobData.vehicle_id] : []),
        vehicle_services: Object.keys(vehicle_services).length > 0 ? vehicle_services : (jobData.service_id && firstVid ? { [firstVid]: [jobData.service_id] } : {}),
        vehicle_sizes,
        scheduled_at: local.toISOString().slice(0, 16),
        address: jobData.address,
        status: jobData.status,
        notes: jobData.notes ?? '',
        send_confirmation_email: true,
        location_id: (jobData as { location_id?: string | null }).location_id ?? '',
      })
      setLoading(false)
    })
  }, [open, jobId, isCreate, initialScheduledAt, initialJobData])

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const orgId = user
        ? (await supabase.from('profiles').select('org_id').eq('id', user.id).single()).data?.org_id ?? null
        : null
      if (cancelled) return
      if (orgId) {
        const [clientRes, serviceRes] = await Promise.all([
          supabase.from('clients').select('*').eq('org_id', orgId).order('name'),
          supabase.from('services').select('*').eq('org_id', orgId).order('name'),
        ])
        if (!cancelled) {
          setCustomers(clientRes.data ?? [])
          setServices(serviceRes.data ?? [])
          const serviceIds = (serviceRes.data ?? []).map((s: { id: string }) => s.id)
          if (serviceIds.length > 0) {
            const { data: sizeRows } = await supabase.from('service_size_prices').select('service_id, size_key, label, price_offset').in('service_id', serviceIds)
            if (!cancelled && sizeRows?.length) {
              setSizePriceRows(sizeRows as { service_id: string; size_key: string; label: string; price_offset: number }[])
              const byKey = new Map<string, SizeOption>()
              ;(sizeRows as { size_key: string; label: string; price_offset: number }[]).forEach((r) => {
                const offset = Number(r.price_offset) || 0
                if (!byKey.has(r.size_key) || offset > (byKey.get(r.size_key)!.price_offset ?? 0))
                  byKey.set(r.size_key, { size_key: r.size_key, label: r.label, price_offset: offset })
              })
              setSizeOptions([...byKey.values()].sort((a, b) => a.price_offset - b.price_offset))
            }
          }
        }
      } else {
        setCustomers([])
        setServices([])
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
    const address = (form.address || '').trim()
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
  }, [form.address])

  useEffect(() => {
    if (!form.customer_id) {
      setVehicles([])
      setForm((prev) => ({ ...prev, vehicle_ids: [] }))
      return
    }
    const supabase = createClient()
    supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', form.customer_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data ?? []
        setVehicles(list)
        setForm((prev) => {
          const nextVs: Record<string, string[]> = {}
          const nextSizes: Record<string, number> = {}
          prev.vehicle_ids.forEach((vid) => {
            if (list.some((v: { id: string }) => v.id === vid)) {
              nextVs[vid] = prev.vehicle_services[vid] ?? []
              nextSizes[vid] = prev.vehicle_sizes[vid] ?? 0
            }
          })
          return {
            ...prev,
            vehicle_ids: prev.vehicle_ids.filter((vid) => list.some((v: { id: string }) => v.id === vid)),
            vehicle_services: nextVs,
            vehicle_sizes: nextSizes,
          }
        })
      })
  }, [form.customer_id])

  useEffect(() => {
    const c = customers.find((x) => x.id === form.customer_id) as Client & { address?: string } | undefined
    if (c?.address && !form.address) setForm((prev) => ({ ...prev, address: c.address ?? '' }))
  }, [form.customer_id, customers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const vehicleServices: { vehicle_id: string | null; service_id: string }[] = []
    form.vehicle_ids.forEach((vid) => {
      (form.vehicle_services[vid] ?? []).forEach((sid) => vehicleServices.push({ vehicle_id: vid, service_id: sid }))
    })
    const basePrice = vehicleServices.reduce((sum, l) => {
      const s = services.find((x) => x.id === l.service_id) as { base_price?: number } | undefined
      return sum + (s?.base_price ?? 0)
    }, 0)
    const vehicle_sizes: Record<string, number> = {}
    form.vehicle_ids.forEach((vid) => {
      vehicle_sizes[vid] = typeof form.vehicle_sizes[vid] === 'number' ? form.vehicle_sizes[vid] : sizeOptions[0]?.price_offset ?? 0
    })
    const locationId = (form.location_id && form.location_id.trim()) || suggestedLocation?.location_id || undefined
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: form.customer_id,
        vehicle_ids: form.vehicle_ids.length ? form.vehicle_ids : undefined,
        vehicle_services: vehicleServices.length > 0 ? vehicleServices : undefined,
        vehicle_sizes: Object.keys(vehicle_sizes).length > 0 ? vehicle_sizes : undefined,
        scheduled_at: form.scheduled_at,
        address: form.address.trim(),
        notes: form.notes.trim() || null,
        base_price: basePrice,
        ...(locationId !== undefined && { location_id: locationId }),
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.id) {
      setSaving(false)
      return
    }
    const newJobId = data.id
    fetch(`/api/integrations/google/sync/job/${newJobId}`, { method: 'POST' }).catch(() => {})
    fetch('/api/jobs/notify-new-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: newJobId, sendClientEmail: form.send_confirmation_email }),
    }).catch(() => {})
    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (isCreate) {
      await handleCreate(e)
      return
    }
    if (!jobId || !job) return
    setSaving(true)
    const supabase = createClient()
    const vehicleServices: { vehicle_id: string; service_id: string }[] = []
    form.vehicle_ids.forEach((vid) => {
      (form.vehicle_services[vid] ?? []).forEach((sid) => vehicleServices.push({ vehicle_id: vid, service_id: sid }))
    })
    const basePrice = vehicleServices.reduce((sum, l) => {
      const s = services.find((x) => x.id === l.service_id) as { base_price?: number } | undefined
      return sum + (s?.base_price ?? 0)
    }, 0)
    const firstVehicleId = form.vehicle_ids[0] ?? null
    const firstServiceId = vehicleServices[0]?.service_id ?? null
    const totalSizeOffset = form.vehicle_ids.reduce(
      (sum, vid) => sum + (typeof form.vehicle_sizes[vid] === 'number' ? form.vehicle_sizes[vid] : 0),
      0
    )
    const updates: Record<string, unknown> = {
      customer_id: form.customer_id,
      vehicle_id: firstVehicleId,
      service_id: firstServiceId,
      base_price: basePrice,
      size_price_offset: totalSizeOffset,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      address: form.address.trim(),
      status: form.status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
      location_id: form.location_id && form.location_id.trim() ? form.location_id.trim() : null,
    }
    if (form.status === 'in_progress') updates.actual_started_at = job.actual_started_at ?? new Date().toISOString()
    if (form.status === 'done') {
      updates.actual_ended_at = job.actual_ended_at ?? new Date().toISOString()
      if (!job.actual_started_at) updates.actual_started_at = new Date().toISOString()
    }
    await supabase.from('jobs').update(updates).eq('id', jobId)
    await supabase.from('job_vehicles').delete().eq('job_id', jobId)
    if (form.vehicle_ids.length > 0) {
      await supabase.from('job_vehicles').insert(
        form.vehicle_ids.map((vehicle_id) => {
          const opts = getSizeOptionsForVehicle(vehicle_id)
          const stored = form.vehicle_sizes[vehicle_id]
          const valid = typeof stored === 'number' && opts.some((o) => o.price_offset === stored)
          const size_price_offset = valid ? stored : (opts[0]?.price_offset ?? 0)
          return { job_id: jobId, vehicle_id, size_price_offset }
        })
      )
    }
    await supabase.from('job_services').delete().eq('job_id', jobId)
    if (vehicleServices.length > 0) {
      await supabase.from('job_services').insert(
        vehicleServices.map((l) => ({ job_id: jobId, service_id: l.service_id, vehicle_id: l.vehicle_id }))
      )
    }
    fetch(`/api/integrations/google/sync/job/${jobId}`, { method: 'POST' }).catch(() => {})
    setSaving(false)
    onSaved()
    onClose()
  }

  const statusSteps = ['scheduled', 'en_route', 'in_progress', 'done', 'cancelled', 'no_show'] as const
  const client = job?.clients ? (Array.isArray(job.clients) ? job.clients[0] : job.clients) : null
  const servicesList = job?.services ? (Array.isArray(job.services) ? job.services : [job.services]) : []
  const showForm = (isCreate && !loading) || (!!job && !loading)
  const clientName = (client as { name?: string } | null)?.name ?? 'Job'
  const serviceName = servicesList.length === 0 ? '—' : servicesList.map((s: { name?: string }) => s.name).join(', ')

  function getTitle(): string {
    if (loading && !isCreate) return 'Loading…'
    if (isCreate) return 'New job'
    if (job) return `Edit job · ${clientName} · ${serviceName}`
    return 'Job not found'
  }

  /** Size options for a vehicle based on its selected services; falls back to org-wide sizeOptions if none selected */
  function getSizeOptionsForVehicle(vid: string): SizeOption[] {
    const serviceIds = form.vehicle_services[vid] ?? []
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto max-md:max-w-[calc(100vw-2rem)] max-md:max-h-[85dvh]">
        <DialogClose onClick={onClose} />
        <DialogHeader>
          <DialogTitle className="text-[var(--text)]">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        {loading && !isCreate && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        )}
        {!isCreate && !loading && !job && (
          <div className="py-6 text-center text-sm text-[var(--text-muted)]">
            <p>This job could not be loaded.</p>
            <Button type="button" variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
        {showForm && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {!isCreate && jobId && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={crmPath(`/jobs/${jobId}`)}>Open full job page</Link>
                </Button>
              )}
              {form.address.trim() && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(form.address)}`} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-3.5 w-3 mr-1" />
                    Directions
                  </a>
                </Button>
              )}
            </div>
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Customer</Label>
              <select
                required
                value={form.customer_id}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Vehicles</Label>
              <div className="mt-1 max-h-24 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 space-y-1">
                {vehicles.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-0.5">No vehicles for this customer</p>
                ) : (
                  vehicles.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={form.vehicle_ids.includes(v.id)}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            vehicle_ids: e.target.checked ? [...prev.vehicle_ids, v.id] : prev.vehicle_ids.filter((id) => id !== v.id),
                            vehicle_services: e.target.checked ? { ...prev.vehicle_services, [v.id]: prev.vehicle_services[v.id] ?? [] } : (() => { const n = { ...prev.vehicle_services }; delete n[v.id]; return n })(),
                            vehicle_sizes: e.target.checked ? { ...prev.vehicle_sizes, [v.id]: prev.vehicle_sizes[v.id] ?? sizeOptions[0]?.price_offset ?? 0 } : (() => { const n = { ...prev.vehicle_sizes }; delete n[v.id]; return n })(),
                          }))
                        }}
                        className="rounded border-[var(--border)] text-[var(--accent)]"
                      />
                      <span className="text-sm">{v.year ? `${v.year} ` : ''}{v.make} {v.model}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            {form.vehicle_ids.length > 0 && services.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs text-[var(--text-muted)]">Services & size per vehicle</Label>
                {form.vehicle_ids.map((vid) => {
                  const v = vehicles.find((x) => x.id === vid)
                  const svcIds = form.vehicle_services[vid] ?? []
                  const vehicleSizeOptions = getSizeOptionsForVehicle(vid)
                  const sizeOffset = form.vehicle_sizes[vid] ?? vehicleSizeOptions[0]?.price_offset ?? 0
                  const sizeOffsetValid = vehicleSizeOptions.some((o) => o.price_offset === sizeOffset)
                  const displayOffset = sizeOffsetValid ? sizeOffset : (vehicleSizeOptions[0]?.price_offset ?? 0)
                  return (
                    <div key={vid} className="rounded border border-[var(--border)] bg-[var(--bg)] p-2 space-y-2">
                      <p className="text-xs font-medium text-[var(--text)]">{v ? `${v.year ? `${v.year} ` : ''}${v.make} ${v.model}` : 'Vehicle'}</p>
                      <div>
                        <Label className="text-xs text-[var(--text-muted)]">Add service</Label>
                        <select
                          value=""
                          onChange={(e) => {
                            const sid = e.target.value
                            if (!sid) return
                            setForm((prev) => ({
                              ...prev,
                              vehicle_services: {
                                ...prev.vehicle_services,
                                [vid]: [...(prev.vehicle_services[vid] ?? []), sid],
                              },
                            }))
                            e.target.value = ''
                          }}
                          className="mt-1 flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)]"
                        >
                          <option value="">Select service to add</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      {svcIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {svcIds.map((sid) => {
                            const s = services.find((x) => x.id === sid)
                            return (
                              <span key={`${vid}-${sid}`} className="inline-flex items-center gap-1 rounded bg-[var(--bg-card)] border border-[var(--border)] pl-1.5 pr-1 py-0.5 text-xs">
                                {s?.name ?? sid}
                                <button
                                  type="button"
                                  onClick={() => setForm((prev) => ({
                                    ...prev,
                                    vehicle_services: {
                                      ...prev.vehicle_services,
                                      [vid]: (prev.vehicle_services[vid] ?? []).filter((id) => id !== sid),
                                    },
                                  }))}
                                  className="rounded p-0.5 hover:bg-[var(--text-muted)]/20 text-[var(--text-muted)]"
                                  aria-label="Remove"
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
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            vehicle_sizes: { ...prev.vehicle_sizes, [vid]: Number(e.target.value) },
                          }))}
                          className="mt-1 flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)]"
                        >
                          {vehicleSizeOptions.map((opt) => (
                            <option key={opt.size_key} value={opt.price_offset}>{opt.label}{opt.price_offset > 0 ? ` (+$${opt.price_offset})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Date & time</Label>
              <DateTimeInput
                required
                value={form.scheduled_at}
                onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Address</Label>
              <AddressAutocomplete
                required
                value={form.address}
                onChange={(v) => setForm((prev) => ({ ...prev, address: v }))}
                placeholder="Service address"
                className="mt-1"
              />
            </div>
            {locations.length > 0 && (
              <div>
                <Label className="text-xs text-[var(--text-muted)]">Location</Label>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 mb-1">Auto from address or choose manually.</p>
                <select
                  value={form.location_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, location_id: e.target.value }))}
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">Auto (from address)</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                {form.location_id === '' && suggestedLocation && (
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">Suggested: <strong className="text-[var(--text)]">{suggestedLocation.location_name}</strong></p>
                )}
              </div>
            )}
            {!isCreate && (
              <div>
                <Label className="text-xs text-[var(--text-muted)]">Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  {statusSteps.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes..."
                className="mt-1 min-h-[80px]"
              />
            </div>
            {isCreate && (
              <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                <input
                  type="checkbox"
                  id="schedule_send_confirmation_email"
                  checked={form.send_confirmation_email}
                  onChange={(e) => setForm((prev) => ({ ...prev, send_confirmation_email: e.target.checked }))}
                  className="rounded border-[var(--border)] text-[var(--accent)]"
                />
                <Label htmlFor="schedule_send_confirmation_email" className="cursor-pointer text-xs text-[var(--text)]">
                  Send booking confirmation email to customer
                </Label>
                {(() => {
                  const c = customers.find((x) => x.id === form.customer_id) as (Client & { email?: string }) | undefined
                  if (c && !c?.email?.trim()) return <span className="text-xs text-[var(--text-muted)]">(No email on file)</span>
                  return null
                })()}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (isCreate ? 'Creating…' : 'Saving…') : (isCreate ? 'Create job' : 'Save changes')}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
