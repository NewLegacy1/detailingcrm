'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocationMapPicker } from '@/components/settings/location-map-picker'
import type { Location } from '@/types/locations'

export interface LocationFormValues {
  name: string
  address: string
  lat: number | null
  lng: number | null
  service_radius_km: number | null
  timezone: string
  service_mode: 'mobile' | 'shop' | 'both'
  hours_start: number
  hours_end: number
  slot_interval_minutes: number
  is_active: boolean
}

const defaultValues: LocationFormValues = {
  name: '',
  address: '',
  lat: null,
  lng: null,
  service_radius_km: null,
  timezone: '',
  service_mode: 'both',
  hours_start: 9,
  hours_end: 18,
  slot_interval_minutes: 30,
  is_active: true,
}

interface LocationFormProps {
  location?: Location | null
  orgTimezone?: string
  onSuccess: () => void
  onCancel: () => void
}

interface CalendarOption {
  id: string
  summary: string
  primary?: boolean
}

export function LocationForm({ location, orgTimezone = 'America/Toronto', onSuccess, onCancel }: LocationFormProps) {
  const [form, setForm] = useState<LocationFormValues>(defaultValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const [googleCalendarId, setGoogleCalendarId] = useState<string>('')
  const [calendars, setCalendars] = useState<CalendarOption[]>([])
  const [googleConnected, setGoogleConnected] = useState(false)

  useEffect(() => {
    if (location) {
      setGoogleCalendarId(location.google_calendar_id ?? '')
      setForm({
        name: location.name ?? '',
        address: location.address ?? '',
        lat: location.lat != null ? Number(location.lat) : null,
        lng: location.lng != null ? Number(location.lng) : null,
        service_radius_km: location.service_radius_km != null ? Number(location.service_radius_km) : null,
        timezone: location.timezone ?? orgTimezone,
        service_mode: location.service_mode ?? 'both',
        hours_start: location.hours_start ?? 9,
        hours_end: location.hours_end ?? 18,
        slot_interval_minutes: location.slot_interval_minutes ?? 30,
        is_active: location.is_active !== false,
      })
    } else {
      setForm({ ...defaultValues, timezone: orgTimezone })
      setGoogleCalendarId('')
    }
  }, [location, orgTimezone])

  useEffect(() => {
    if (!location?.id) return
    fetch('/api/integrations/google/status')
      .then((r) => (r.ok ? r.json() : ({} as { connected?: boolean })))
      .then((data) => {
        setGoogleConnected(!!data?.connected)
        if (data?.connected) {
          return fetch('/api/integrations/google/calendars').then((r) => (r.ok ? r.json() : []))
        }
        return []
      })
      .then((list) => setCalendars(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [location?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      lat: form.lat,
      lng: form.lng,
      service_radius_km: form.service_radius_km,
      timezone: form.timezone.trim() || null,
      service_mode: form.service_mode,
      hours_start: form.hours_start,
      hours_end: form.hours_end,
      slot_interval_minutes: form.slot_interval_minutes,
      sort_order: 0,
      is_active: form.is_active,
      booking_promo_code_prefix: null,
    }
    if (location?.id) body.google_calendar_id = googleCalendarId.trim() || null
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
    setGeocodeError(null)
    if (!a) {
      setGeocodeError('Enter an address first')
      return
    }
    setGeocoding(true)
    try {
      const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(a)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setForm((f) => ({ ...f, lat: data.lat, lng: data.lng }))
      } else {
        setGeocodeError(data.error || 'Could not find coordinates for this address')
      }
    } catch {
      setGeocodeError('Geocoding failed. Check your connection or try a different address.')
    } finally {
      setGeocoding(false)
    }
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
        <div className="flex flex-wrap gap-2 items-start">
          <Input
            id="loc-address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Street, city, postal code"
            className="flex-1 min-w-[200px]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={geocodeAddress}
            disabled={geocoding}
            className="shrink-0 bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 border-[var(--accent)]/50"
          >
            {geocoding ? 'Looking up…' : 'Set from address'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMapPickerOpen(true)}
            className="shrink-0 bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 border-[var(--accent)]/50"
          >
            Set on map
          </Button>
        </div>
        {geocodeError && (
          <p className="text-xs text-[var(--danger)] mt-1">{geocodeError}</p>
        )}
        {(form.lat != null && form.lng != null && !geocodeError) && (
          <>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {form.service_radius_km != null
                ? `Service area: ${form.lat.toFixed(4)}, ${form.lng.toFixed(4)} · ${form.service_radius_km.toFixed(1)} km radius`
                : `Map coordinates: ${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}`}
            </p>
            <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
              <img
                src={`/api/map?lat=${form.lat}&lng=${form.lng}&w=400&h=180`}
                alt="Selected location"
                className="w-full h-[180px] object-cover"
              />
            </div>
          </>
        )}
      </div>
      <LocationMapPicker
        open={mapPickerOpen}
        onOpenChange={setMapPickerOpen}
        initialCenter={form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null}
        initialRadiusKm={form.service_radius_km}
        onConfirm={(center, radiusKm) => {
          setForm((f) => ({
            ...f,
            lat: center.lat,
            lng: center.lng,
            service_radius_km: radiusKm,
          }))
          setGeocodeError(null)
        }}
      />
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
      {location?.id && googleConnected && (
        <div>
          <Label htmlFor="loc-google-calendar">Google Calendar (optional)</Label>
          <select
            id="loc-google-calendar"
            value={googleCalendarId}
            onChange={(e) => setGoogleCalendarId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] mt-1"
          >
            <option value="">Use org default calendar</option>
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.summary || cal.id}{cal.primary ? ' (primary)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Jobs at this location will sync to this calendar when set; otherwise the org default is used.
          </p>
        </div>
      )}
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
