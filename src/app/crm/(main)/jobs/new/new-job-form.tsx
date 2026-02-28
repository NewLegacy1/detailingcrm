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
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitUpgradeUrl, setSubmitUpgradeUrl] = useState<string | null>(null)
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
        orgId ? supabase.from('services').select('*').eq('org_id', orgId).order('name') : { data: [] },
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
      setFormData((prev) => ({ ...prev, vehicle_id: '', address: '' }))
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
        setFormData((prev) => ({
          ...prev,
          vehicle_id: '',
          address: customerAddress || prev.address,
        }))
      })
  }, [formData.customer_id, customers])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSubmitError(null)
    setSubmitUpgradeUrl(null)
    const svc = formData.service_id ? services.find((s) => s.id === formData.service_id) : null
    const basePrice = (svc as { base_price?: number } | undefined)?.base_price ?? 0
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
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: formData.customer_id,
        vehicle_id: formData.vehicle_id || null,
        service_id: formData.service_id || null,
        scheduled_at: formData.scheduled_at,
        address: effectiveAddress,
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
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href={crmPath('/customers?add=1')}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add new customer
            </Link>
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
    </>
  )
}
