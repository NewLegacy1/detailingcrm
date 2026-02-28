'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimeInput } from '@/components/ui/date-picker'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { Client } from '@/types/database'
import type { Vehicle } from '@/types/database'
import type { Service } from '@/types/database'

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

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
  const [loading, setLoading] = useState(false)
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [addCustomerLoading, setAddCustomerLoading] = useState(false)
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitUpgradeUrl, setSubmitUpgradeUrl] = useState<string | null>(null)
  const [addCustomerForm, setAddCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: '',
    sms_opt_in: false,
  })
  const [formData, setFormData] = useState({
    customer_id: preselectedCustomer,
    vehicle_id: '',
    service_id: '',
    scheduled_at: scheduledAtInitial,
    address: '',
    notes: '',
  })

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
        supabase.from('services').select('*').order('name'),
      ])
      if (!cancelled) {
        setCustomers(custRes.data ?? [])
        setServices(svcRes.data ?? [])
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!formData.customer_id) {
      setVehicles([])
      setFormData((prev) => ({ ...prev, vehicle_id: '' }))
      return
    }
    const supabase = createClient()
    supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', formData.customer_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVehicles(data ?? [])
        setFormData((prev) => ({ ...prev, vehicle_id: '' }))
      })
  }, [formData.customer_id])

  function handleAddCustomerPhoneChange(value: string) {
    const digits = value.replace(/\D/g, '')
    setAddCustomerForm((prev) => ({ ...prev, phone: digits }))
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    setAddCustomerError(null)
    setAddCustomerLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setAddCustomerLoading(false)
      setAddCustomerError('You must be signed in to add a customer.')
      return
    }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id ?? null
    if (!orgId) {
      setAddCustomerLoading(false)
      setAddCustomerError('Your account is not assigned to an organization. Contact an admin or check Settings.')
      return
    }
    const payload: Record<string, unknown> = {
      name: addCustomerForm.name,
      email: addCustomerForm.email || null,
      phone: addCustomerForm.phone || null,
      company: addCustomerForm.company || null,
      address: addCustomerForm.address || null,
      notes: addCustomerForm.notes || null,
      created_by: user.id,
      org_id: orgId,
    }
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert([payload])
      .select('id, name, email, phone, company, address, notes, created_by, created_at')
      .single()
    setAddCustomerLoading(false)
    if (error) {
      setAddCustomerError(error.message)
      return
    }
    if (newClient) {
      setCustomers((prev) => [...prev, newClient as Client].sort((a, b) => a.name.localeCompare(b.name)))
      setFormData((prev) => ({ ...prev, customer_id: newClient.id, address: (newClient.address ?? '') || formData.address }))
      setAddCustomerOpen(false)
      setAddCustomerForm({ name: '', email: '', phone: '', company: '', address: '', notes: '', sms_opt_in: false })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setAddCustomerError(null)
    setSubmitError(null)
    setSubmitUpgradeUrl(null)
    const svc = formData.service_id ? services.find((s) => s.id === formData.service_id) : null
    const basePrice = (svc as { base_price?: number } | undefined)?.base_price ?? 0
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: formData.customer_id,
        vehicle_id: formData.vehicle_id || null,
        service_id: formData.service_id || null,
        scheduled_at: formData.scheduled_at,
        address: formData.address.trim(),
        notes: formData.notes.trim() || null,
        base_price: basePrice,
        size_price_offset: 0,
      }),
    })
    const data = await res.json()

    if (res.ok && data.id) {
      const jobId = data.id
      fetch(`/api/integrations/google/sync/job/${jobId}`, { method: 'POST' }).catch(() => {})
      fetch('/api/jobs/notify-new-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
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

  return (
    <>
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 card p-6">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <Label htmlFor="customer_id">Customer *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => { setAddCustomerOpen(true); setAddCustomerError(null) }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add new customer
          </Button>
        </div>
        <select
          id="customer_id"
          required
          value={formData.customer_id}
          onChange={(e) => setFormData((prev) => ({ ...prev, customer_id: e.target.value }))}
          className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="vehicle_id">Vehicle</Label>
        <select
          id="vehicle_id"
          value={formData.vehicle_id}
          onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_id: e.target.value }))}
          className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
        >
          <option value="">Select vehicle (optional)</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.year ? `${v.year} ` : ''}{v.make} {v.model}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="service_id">Service</Label>
        <select
          id="service_id"
          value={formData.service_id}
          onChange={(e) => setFormData((prev) => ({ ...prev, service_id: e.target.value }))}
          className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
        >
          <option value="">Select service (optional)</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
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
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </div>
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

    <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
      <DialogContent>
        <DialogClose onClick={() => setAddCustomerOpen(false)} />
        <DialogHeader>
          <DialogTitle>Add new customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddCustomer} className="space-y-4">
          {addCustomerError && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {addCustomerError}
            </div>
          )}
          <div>
            <Label htmlFor="add-name">Name *</Label>
            <Input
              id="add-name"
              value={addCustomerForm.name}
              onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              type="email"
              value={addCustomerForm.email}
              onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="add-phone">Phone</Label>
            <Input
              id="add-phone"
              value={addCustomerForm.phone ? formatPhoneNumber(addCustomerForm.phone) : ''}
              onChange={(e) => handleAddCustomerPhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <Label htmlFor="add-address">Address</Label>
            <AddressAutocomplete
              id="add-address"
              value={addCustomerForm.address}
              onChange={(v) => setAddCustomerForm((prev) => ({ ...prev, address: v }))}
              placeholder="Service address"
            />
          </div>
          <div>
            <Label htmlFor="add-notes">Notes</Label>
            <Textarea
              id="add-notes"
              value={addCustomerForm.notes}
              onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="rounded-lg border border-white/10 bg-[var(--surface-1)] p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={addCustomerForm.sms_opt_in}
                onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, sms_opt_in: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-white/10 bg-[var(--surface-1)] text-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Customer consents to receive SMS from the business (e.g. appointment reminders).
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setAddCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addCustomerLoading}>
              {addCustomerLoading ? 'Saving...' : 'Add customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
