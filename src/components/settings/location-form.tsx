'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Location } from '@/types/locations'

export interface LocationFormValues {
  name: string
  address: string
  lat: number | null
  lng: number | null
  timezone: string
  service_mode: 'mobile' | 'shop' | 'both'
  hours_start: number
  hours_end: number
  slot_interval_minutes: number
  sort_order: number
  is_active: boolean
  booking_promo_code_prefix: string
}

const defaultValues: LocationFormValues = {
  name: '',
  address: '',
  lat: null,
  lng: null,
  timezone: '',
  service_mode: 'both',
  hours_start: 9,
  hours_end: 18,
  slot_interval_minutes: 30,
  sort_order: 0,
  is_active: true,
  booking_promo_code_prefix: '',
}

interface LocationFormProps {
  location?: Location | null
  orgTimezone?: string
  onSuccess: () => void
  onCancel: () => void
}

export function LocationForm({ location, orgTimezone = 'America/Toronto', onSuccess, onCancel }: LocationFormProps) {
  const [form, setForm] = useState<LocationFormValues>(defaultValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name ?? '',
        address: location.address ?? '',
        lat: location.lat != null ? Number(location.lat) : null,
        lng: location.lng != null ? Number(location.lng) : null,
        timezone: location.timezone ?? orgTimezone,
        service_mode: location.service_mode ?? 'both',
        hours_start: location.hours_start ?? 9,
        hours_end: location.hours_end ?? 18,
        slot_interval_minutes: location.slot_interval_minutes ?? 30,
        sort_order: location.sort_order ?? 0,
        is_active: location.is_active !== false,
        booking_promo_code_prefix: location.booking_promo_code_prefix ?? '',
      })
    } else {
      setForm({ ...defaultValues, timezone: orgTimezone })
    }
  }, [location, orgTimezone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const body = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      lat: form.lat,
      lng: form.lng,
      timezone: form.timezone.trim() || null,
      service_mode: form.service_mode,
      hours_start: form.hours_start,
      hours_end: form.hours_end,
      slot_interval_minutes: form.slot_interval_minutes,
      sort_order: form.sort_order,
      is_active: form.is_active,
      booking_promo_code_prefix: form.booking_promo_code_prefix.trim() || null,
    }
    try {
      if (location?.id) {
        const res = await fetch(`/api/locations/${location.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'Failed to update location')
          setSaving(false)
          return
        }
      } else {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'Failed to create location')
          setSaving(false)
          return
        }
      }
      onSuccess()
    } catch {
      setError('Something went wrong')
    }
    setSaving(false)
  }

  const geocodeAddress = async () => {
    const a = form.address.trim()
    if (!a) return
    try {
      const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(a)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setForm((f) => ({ ...f, lat: data.lat, lng: data.lng }))
      }
    } catch {}
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="loc-name">Name</Label>
        <Input
          id="loc-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Downtown Shop"
          required
        />
      </div>
      <div>
        <Label htmlFor="loc-address">Address</Label>
        <div className="flex gap-2">
          <Input
            id="loc-address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Street, city, postal code"
          />
          <Button type="button" variant="outline" size="sm" onClick={geocodeAddress}>
            Set map
          </Button>
        </div>
        {form.lat != null && form.lng != null && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Coordinates: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="loc-hours-start">Hours start (0–23)</Label>
          <Input
            id="loc-hours-start"
            type="number"
            min={0}
            max={23}
            value={form.hours_start}
            onChange={(e) => setForm((f) => ({ ...f, hours_start: parseInt(e.target.value, 10) || 0 }))}
          />
        </div>
        <div>
          <Label htmlFor="loc-hours-end">Hours end (1–24)</Label>
          <Input
            id="loc-hours-end"
            type="number"
            min={1}
            max={24}
            value={form.hours_end}
            onChange={(e) => setForm((f) => ({ ...f, hours_end: parseInt(e.target.value, 10) || 18 }))}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="loc-slot-interval">Slot interval (minutes)</Label>
        <Input
          id="loc-slot-interval"
          type="number"
          min={5}
          max={120}
          value={form.slot_interval_minutes}
          onChange={(e) => setForm((f) => ({ ...f, slot_interval_minutes: parseInt(e.target.value, 10) || 30 }))}
        />
      </div>
      <div>
        <Label>Service mode</Label>
        <div className="flex gap-4 mt-1">
          {(['mobile', 'shop', 'both'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="service_mode"
                checked={form.service_mode === mode}
                onChange={() => setForm((f) => ({ ...f, service_mode: mode }))}
                className="rounded border-[var(--border)]"
              />
              {mode === 'mobile' ? 'Mobile only' : mode === 'shop' ? 'Shop only' : 'Both'}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="loc-timezone">Timezone</Label>
        <Input
          id="loc-timezone"
          value={form.timezone}
          onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          placeholder="America/Toronto"
        />
      </div>
      <div>
        <Label htmlFor="loc-sort">Sort order</Label>
        <Input
          id="loc-sort"
          type="number"
          value={form.sort_order}
          onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
        />
      </div>
      <div>
        <Label htmlFor="loc-promo">Promo code prefix (optional)</Label>
        <Input
          id="loc-promo"
          value={form.booking_promo_code_prefix}
          onChange={(e) => setForm((f) => ({ ...f, booking_promo_code_prefix: e.target.value }))}
          placeholder="e.g. DOWNTOWN10"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="loc-active"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          className="rounded border-[var(--border)]"
        />
        <Label htmlFor="loc-active">Active (show in booking)</Label>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : location ? 'Update location' : 'Create location'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
