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
  vehicles: { id: string; make: string; model: string; year: number | null; color: string | null } | null
  services: { id: string; name: string; duration_mins: number } | null
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
    vehicle_id: '',
    service_id: '',
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
    // Use pre-fetched data when provided (from JobDetailPopup) to avoid re-fetch failures
    if (initialJobData && initialJobData.id === jobId) {
      const jobData = initialJobData
      setJob(jobData)
      const d = new Date(jobData.scheduled_at)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
      setForm({
        customer_id: jobData.customer_id,
        vehicle_id: jobData.vehicle_id ?? '',
        service_id: jobData.service_id ?? '',
        scheduled_at: local.toISOString().slice(0, 16),
        address: jobData.address,
        status: jobData.status,
        notes: jobData.notes ?? '',
      })
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('jobs')
      .select(`
        id, customer_id, vehicle_id, service_id, scheduled_at, address, status, notes,
        actual_started_at, actual_ended_at,
        clients(id, name, email, phone, address),
        vehicles(id, make, model, year, color),
        services(id, name, duration_mins)
      `)
      .eq('id', jobId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setJob(null)
          setLoading(false)
          return
        }
        const jobData = data as unknown as JobFull
        setJob(jobData)
        const d = new Date(jobData.scheduled_at)
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
        setForm({
          customer_id: jobData.customer_id,
          vehicle_id: jobData.vehicle_id ?? '',
          service_id: jobData.service_id ?? '',
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
      setForm((prev) => ({ ...prev, vehicle_id: '' }))
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
          vehicle_id: list.some((v) => v.id === prev.vehicle_id) ? prev.vehicle_id : '',
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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let orgId: string | null = null
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      orgId = profile?.org_id ?? null
    }
    const svc = form.service_id ? services.find((s) => s.id === form.service_id) : null
    const basePrice = svc?.base_price ?? 0
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        customer_id: form.customer_id,
        vehicle_id: form.vehicle_id || null,
        service_id: form.service_id || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        address: form.address.trim(),
        status: 'scheduled',
        notes: form.notes.trim() || null,
        org_id: orgId,
        base_price: basePrice,
        size_price_offset: 0,
      }])
      .select('id')
      .single()
    if (error || !data) {
      setSaving(false)
      return
    }
    const newJobId = data.id
    if (orgId) {
      const { data: defaultItems } = await supabase
        .from('organization_default_checklist')
        .select('label, sort_order')
        .eq('org_id', orgId)
        .order('sort_order')
      if (defaultItems?.length) {
        await supabase.from('job_checklist_items').insert(
          defaultItems.map((item) => ({ job_id: newJobId, label: item.label, sort_order: item.sort_order, checked: false }))
        )
      }
    }
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
    const updates: Record<string, unknown> = {
      customer_id: form.customer_id,
      vehicle_id: form.vehicle_id || null,
      service_id: form.service_id || null,
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
    fetch(`/api/integrations/google/sync/job/${jobId}`, { method: 'POST' }).catch(() => {})
    setSaving(false)
    onSaved()
    onClose()
  }

  const statusSteps = ['scheduled', 'en_route', 'in_progress', 'done', 'cancelled', 'no_show'] as const
  const client = job?.clients ? (Array.isArray(job.clients) ? job.clients[0] : job.clients) : null
  const vehicle = job?.vehicles
  const service = job?.services
  const showForm = (isCreate && !loading) || (!!job && !loading)
  const clientName = (client as { name?: string } | null)?.name ?? 'Job'
  const serviceName = (service as { name?: string } | null)?.name ?? '—'

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
              <Label className="text-xs text-[var(--text-muted)]">Vehicle</Label>
              <select
                value={form.vehicle_id}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicle_id: e.target.value }))}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="">Optional</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.year ? `${v.year} ` : ''}{v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Service</Label>
              <select
                value={form.service_id}
                onChange={(e) => setForm((prev) => ({ ...prev, service_id: e.target.value }))}
                className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="">Optional</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
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
