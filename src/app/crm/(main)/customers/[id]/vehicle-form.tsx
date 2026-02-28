'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Vehicle } from '@/types/database'

interface VehicleFormProps {
  customerId: string
  /** Existing vehicle to edit (partial shape from list is ok) */
  vehicle?: Partial<Vehicle> & { id: string } | null
  /** When provided, called on success instead of navigating (e.g. when used in a modal) */
  onSuccess?: () => void
  /** When provided, called when Cancel is clicked (e.g. close modal) */
  onCancel?: () => void
}

export function VehicleForm({ customerId, vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year != null ? String(vehicle.year) : '',
    color: vehicle?.color ?? '',
    vin: vehicle?.vin ?? '',
    notes: vehicle?.notes ?? '',
    mileage: vehicle?.mileage != null ? String(vehicle.mileage) : '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()

    const payload = {
      customer_id: customerId,
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: formData.year ? Number(formData.year) : null,
      mileage: formData.mileage ? Number(formData.mileage) : null,
      color: formData.color.trim() || null,
      vin: formData.vin.trim() || null,
      notes: formData.notes.trim() || null,
    }

    try {
      if (vehicle) {
        const { error: err } = await supabase
          .from('vehicles')
          .update(payload)
          .eq('id', vehicle.id)
        if (err) {
          setError(err.message)
          return
        }
        if (onSuccess) onSuccess()
        else { router.push(crmPath(`/customers/${customerId}`)); router.refresh() }
      } else {
        const { error: err } = await supabase.from('vehicles').insert([payload])
        if (err) {
          setError(err.message)
          return
        }
        if (onSuccess) onSuccess()
        else { router.push(crmPath(`/customers/${customerId}`)); router.refresh() }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 card p-6">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm p-3">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="make">Make *</Label>
          <Input
            id="make"
            value={formData.make}
            onChange={(e) => setFormData((prev) => ({ ...prev, make: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="model">Model *</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            min={1900}
            max={2100}
            value={formData.year}
            onChange={(e) => setFormData((prev) => ({ ...prev, year: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="vin">VIN</Label>
        <Input
          id="vin"
          value={formData.vin}
          onChange={(e) => setFormData((prev) => ({ ...prev, vin: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="mileage">Mileage</Label>
        <Input
          id="mileage"
          type="number"
          min={0}
            value={formData.mileage}
            onChange={(e) => setFormData((prev) => ({ ...prev, mileage: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="e.g. Paint correction done March 2025"
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : vehicle ? 'Update' : 'Add vehicle'}
        </Button>
        <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.push(crmPath(`/customers/${customerId}`)))}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
