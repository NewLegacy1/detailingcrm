'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ServiceRow {
  service_id: string
  name: string
  base_price: number
  is_offered: boolean
  price_override: number | null
}

interface LocationServicesEditorProps {
  locationId: string
  onSaved?: () => void
}

export function LocationServicesEditor({ locationId, onSaved }: LocationServicesEditorProps) {
  const [items, setItems] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/locations/${locationId}/services`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ServiceRow[]) => {
        setItems(Array.isArray(data) ? data : [])
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [locationId])

  const setOffered = (serviceId: string, is_offered: boolean) => {
    setItems((prev) =>
      prev.map((r) => (r.service_id === serviceId ? { ...r, is_offered } : r))
    )
  }

  const setPriceOverride = (serviceId: string, price_override: number | null) => {
    setItems((prev) =>
      prev.map((r) => (r.service_id === serviceId ? { ...r, price_override } : r))
    )
  }

  const handleSave = async () => {
    setMessage(null)
    setSaving(true)
    const services = items.map((r) => ({
      service_id: r.service_id,
      is_offered: r.is_offered,
      price_override: r.price_override,
    }))
    try {
      const res = await fetch(`/api/locations/${locationId}/services`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'Failed to save')
      } else {
        setMessage('Saved.')
        onSaved?.()
      }
    } catch {
      setMessage('Something went wrong')
    }
    setSaving(false)
  }

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading services…</p>

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Choose which services are offered at this location. Optionally set a price override (leave blank to use org default).
      </p>
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
              <th className="text-left p-2 font-medium">Service</th>
              <th className="text-left p-2 font-medium w-24">Offered</th>
              <th className="text-left p-2 font-medium">Price override</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.service_id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2">{r.name}</td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={r.is_offered}
                    onChange={(e) => setOffered(r.service_id, e.target.checked)}
                    className="rounded border-[var(--border)]"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    step={0.01}
                    min={0}
                    placeholder={String(r.base_price)}
                    value={r.price_override ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      setPriceOverride(r.service_id, v === '' ? null : parseFloat(v) || null)
                    }}
                    className="w-24 h-8 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">No services in this organization yet. Add services first.</p>
      )}
      {message && <p className="text-sm text-[var(--text-muted)]">{message}</p>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save services'}
      </Button>
    </div>
  )
}
