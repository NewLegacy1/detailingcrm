'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { LocationForm } from '@/components/settings/location-form'
import { LocationServicesEditor } from '@/components/settings/location-services-editor'
import type { Location } from '@/types/locations'
import { PLAN_PAGE_PATH } from '@/components/settings/plan-page-actions'
import { MapPin, Pencil, Trash2 } from 'lucide-react'

interface LocationsClientProps {
  initialLocations: Location[]
  orgTimezone: string
  isPro: boolean
  multiLocationEnabled: boolean
}

export function LocationsClient({ initialLocations, orgTimezone, isPro, multiLocationEnabled: initialMultiLocationEnabled }: LocationsClientProps) {
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(initialMultiLocationEnabled)
  const [togglingMulti, setTogglingMulti] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [servicesEditorLocationId, setServicesEditorLocationId] = useState<string | null>(null)

  const fetchLocations = () => {
    fetch('/api/locations')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Location[]) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  const openAdd = () => {
    setEditingLocation(null)
    setFormOpen(true)
  }

  const openEdit = (loc: Location) => {
    setEditingLocation(loc)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingLocation(null)
  }

  const handleFormSuccess = () => {
    fetchLocations()
    closeForm()
  }

  const handleDelete = async (loc: Location) => {
    if (!confirm(`Delete "${loc.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/locations/${loc.id}`, { method: 'DELETE' })
    if (res.ok) fetchLocations()
  }

  const handleMultiLocationToggle = async () => {
    if (!isPro) return
    setTogglingMulti(true)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multi_location_enabled: !multiLocationEnabled }),
      })
      if (res.ok) setMultiLocationEnabled((v) => !v)
    } catch {}
    setTogglingMulti(false)
  }

  if (!isPro) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--text-muted)]">
          Multi-location booking is available on the Pro plan. Upgrade to add multiple locations and show a location step on your booking page.
        </p>
        <Link href={PLAN_PAGE_PATH}>
          <Button>View plan</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div>
          <p className="font-medium text-[var(--text)]">Enable multi-location booking</p>
          <p className="text-sm text-[var(--text-muted)]">
            When on and you have more than one active location, customers will see a location step on your booking page.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={multiLocationEnabled}
          disabled={togglingMulti}
          onClick={handleMultiLocationToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-[var(--border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${multiLocationEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg)]'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${multiLocationEnabled ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-muted)]">
          Add and manage locations. Customers will choose from active locations when multi-location is enabled.
        </p>
        <Button onClick={openAdd}>
          Add location
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No locations yet. Add one to get started.</p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-[var(--text)] flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  {loc.name}
                </div>
                {loc.address && (
                  <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">{loc.address}</p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {loc.service_mode} · {loc.hours_start}:00–{loc.hours_end}:00 · {loc.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setServicesEditorLocationId(loc.id)}>
                  Services
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(loc)} className="text-[var(--danger)]">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit location' : 'Add location'}</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <LocationForm
            location={editingLocation}
            orgTimezone={orgTimezone}
            onSuccess={handleFormSuccess}
            onCancel={closeForm}
          />
        </DialogContent>
      </Dialog>

      {servicesEditorLocationId && (
        <Dialog open={!!servicesEditorLocationId} onOpenChange={(open) => !open && setServicesEditorLocationId(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Services at this location</DialogTitle>
              <DialogClose />
            </DialogHeader>
            <LocationServicesEditor
              locationId={servicesEditorLocationId}
              onSaved={() => {}}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
