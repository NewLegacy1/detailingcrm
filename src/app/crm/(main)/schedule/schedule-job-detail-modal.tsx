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
  const [form, setForm] = useState({
    customer_id: '',
    vehicle_ids: [] as string[],
    service_ids: [] as string[],
    scheduled_at: '',
    address: '',
    status: 'scheduled',
    notes: '',
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
        id, customer_id, vehicle_id, service_id, scheduled_at, address, status, notes,
        actual_started_at, actual_ended_at,
        clients(id, name, email, phone, address),
        vehicles(id, make, model, year, color),
        services(id, name, duration_mins)
      `).eq('id', jobId).single(),
      supabase.from('job_vehicles').select('vehicle_id').eq('job_id', jobId),
      supabase.from('job_services').select('service_id').eq('job_id', jobId),
    ]).then(([jobRes, jvRes, jsRes]) => {
      if (jobRes.error || !jobRes.data) {
        setJob(null)
        setLoading(false)
        return
      }
      const jobData = jobRes.data as unknown as JobFull
      const vehicleIds = (jvRes.data ?? []).map((r: { vehicle_id: string }) => r.vehicle_id)
      const serviceIds = (jsRes.data ?? []).map((r: { service_id: string }) => r.service_id)
      setJob(jobData)
      const d = new Date(jobData.scheduled_at)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
      setForm({
        customer_id: jobData.customer_id,
        vehicle_ids: vehicleIds.length > 0 ? vehicleIds : (jobData.vehicle_id ? [jobData.vehicle_id] : []),
        service_ids: serviceIds.length > 0 ? serviceIds : (jobData.service_id ? [jobData.service_id] : []),
        scheduled_at: local.toISOString().slice(0, 16),
        address: jobData.address,
        status: jobData.status,
        notes: jobData.notes ?? '',
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
        const { data: clientData } = await supabase.from('clients').select('*').eq('org_id', orgId).order('name')
        if (!cancelled) setCustomers(clientData ?? [])
      }
      const { data: serviceData } = await supabase.from('services').select('*').order('name')
      if (!cancelled) setServices(serviceData ?? [])
    })()
    return () => { cancelled = true }
  }, [])

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
        setForm((prev) => ({
          ...prev,
          vehicle_ids: prev.vehicle_ids.filter((vid) => list.some((v: { id: string }) => v.id === vid)),
        }))
      })
  }, [form.customer_id])

  useEffect(() => {
    const c = customers.find((x) => x.id === form.customer_id) as Client & { address?: string } | undefined
    if (c?.address && !form.address) setForm((prev) => ({ ...prev, address: c.address ?? '' }))
  }, [form.customer_id, customers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const selectedServices = services.filter((s) => form.service_ids.includes(s.id))
    const basePrice = selectedServices.reduce((sum, s) => sum + (s.base_price ?? 0), 0)
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: form.customer_id,
        vehicle_ids: form.vehicle_ids.length ? form.vehicle_ids : undefined,
        service_ids: form.service_ids.length ? form.service_ids : undefined,
        scheduled_at: form.scheduled_at,
        address: form.address.trim(),
        notes: form.notes.trim() || null,
        base_price: basePrice,
        size_price_offset: 0,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.id) {
      setSaving(false)
      return
    }
    const newJobId = data.id
    fetch(`/api/integrations/google/sync/job/${newJobId}`, { method: 'POST' }).catch(() => {})
    fetch('/api/jobs/notify-new-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: newJobId }) }).catch(() => {})
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
    const firstVehicleId = form.vehicle_ids[0] ?? null
    const firstServiceId = form.service_ids[0] ?? null
    const selectedServices = services.filter((s) => form.service_ids.includes(s.id))
    const basePrice = selectedServices.reduce((sum, s) => sum + (s.base_price ?? 0), 0)
    const updates: Record<string, unknown> = {
      customer_id: form.customer_id,
      vehicle_id: firstVehicleId,
      service_id: firstServiceId,
      base_price: basePrice,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      address: form.address.trim(),
      status: form.status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
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
        form.vehicle_ids.map((vehicle_id) => ({ job_id: jobId, vehicle_id }))
      )
    }
    await supabase.from('job_services').delete().eq('job_id', jobId)
    if (form.service_ids.length > 0) {
      await supabase.from('job_services').insert(
        form.service_ids.map((service_id) => ({ job_id: jobId, service_id }))
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
              <Label className="text-xs text-[var(--text-muted)]">Vehicle(s)</Label>
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
                            vehicle_ids: e.target.checked
                              ? [...prev.vehicle_ids, v.id]
                              : prev.vehicle_ids.filter((id) => id !== v.id),
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
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Service(s)</Label>
              <div className="mt-1 max-h-24 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 space-y-1">
                {services.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-0.5">No services</p>
                ) : (
                  services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        checked={form.service_ids.includes(s.id)}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            service_ids: e.target.checked
                              ? [...prev.service_ids, s.id]
                              : prev.service_ids.filter((id) => id !== s.id),
                          }))
                        }}
                        className="rounded border-[var(--border)] text-[var(--accent)]"
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
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
