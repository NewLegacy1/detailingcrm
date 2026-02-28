'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Plus, Car } from 'lucide-react'

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

export function CustomersAddButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  notes: '',
  sms_opt_in: false,
  })
  const initialVehicle = { make: '', model: '', year: '', color: '' }
  const [vehicle, setVehicle] = useState(initialVehicle)

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '')
    setFormData((prev) => ({ ...prev, phone: digits }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setLoading(false)
      setError('You must be signed in to add a customer.')
      return
    }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id ?? null
    if (!orgId) {
      setLoading(false)
      setError('Your account is not assigned to an organization. Contact an admin or check Settings.')
      return
    }
    const payload = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      company: formData.company || null,
      address: formData.address || null,
      notes: formData.notes || null,
      created_by: user.id,
      org_id: orgId,
    }
    const { data: newClient, error: err } = await supabase.from('clients').insert([payload]).select('id').single()
    if (err || !newClient?.id) {
      setLoading(false)
      setError(err?.message ?? 'Failed to create customer.')
      return
    }
    const hasVehicle = vehicle.make.trim() || vehicle.model.trim() || vehicle.year.trim() || vehicle.color.trim()
    if (hasVehicle) {
      await supabase.from('vehicles').insert([{
        customer_id: newClient.id,
        make: vehicle.make.trim() || 'Unknown',
        model: vehicle.model.trim() || 'Unknown',
        year: vehicle.year.trim() ? parseInt(vehicle.year, 10) : null,
        color: vehicle.color.trim() || null,
      }])
    }
    setLoading(false)
    setOpen(false)
    setFormData({ name: '', email: '', phone: '', company: '', address: '', notes: '', sms_opt_in: false })
    setVehicle(initialVehicle)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" className="w-full justify-center" onClick={() => { setOpen(true); setError(null) }}>
        <Plus className="h-4 w-4 mr-1" />
        Add customer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="add-name">Name *</Label>
              <Input id="add-name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="add-phone">Phone</Label>
              <Input id="add-phone" value={formData.phone ? formatPhoneNumber(formData.phone) : ''} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label htmlFor="add-address">Address</Label>
              <AddressAutocomplete
                id="add-address"
                value={formData.address}
                onChange={(v) => setFormData((prev) => ({ ...prev, address: v }))}
                placeholder="Service address"
              />
            </div>
            <div>
              <Label htmlFor="add-notes">Notes</Label>
              <Textarea id="add-notes" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
            <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                <Car className="h-4 w-4" />
                Garage (optional) — add a vehicle
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-vehicle-make">Make</Label>
                  <Input id="add-vehicle-make" value={vehicle.make} onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))} placeholder="e.g. Honda" />
                </div>
                <div>
                  <Label htmlFor="add-vehicle-model">Model</Label>
                  <Input id="add-vehicle-model" value={vehicle.model} onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))} placeholder="e.g. Civic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-vehicle-year">Year</Label>
                  <Input id="add-vehicle-year" type="number" min={1900} max={2100} value={vehicle.year} onChange={(e) => setVehicle((v) => ({ ...v, year: e.target.value }))} placeholder="e.g. 2022" />
                </div>
                <div>
                  <Label htmlFor="add-vehicle-color">Color</Label>
                  <Input id="add-vehicle-color" value={vehicle.color} onChange={(e) => setVehicle((v) => ({ ...v, color: e.target.value }))} placeholder="e.g. Black" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[var(--surface-1)] p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.sms_opt_in}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sms_opt_in: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-white/10 bg-[var(--surface-1)] text-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  Customer consents to receive SMS from the business (e.g. appointment reminders, marketing). You must have explicit consent under CASL to send commercial SMS.
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
