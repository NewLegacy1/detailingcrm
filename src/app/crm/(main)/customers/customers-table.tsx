'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { crmPath } from '@/lib/crm-path'
import type { Client } from '@/types/database'

interface CustomersTableProps {
  initialCustomers: Client[]
}

export function CustomersTable({ initialCustomers }: CustomersTableProps) {
  const [customers, setCustomers] = useState<Client[]>(initialCustomers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  function openCreateDialog() {
    setEditingCustomer(null)
    setFormData({ name: '', email: '', phone: '', company: '', address: '', notes: '' })
    setIsDialogOpen(true)
  }

  function openEditDialog(customer: Client) {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      company: customer.company ?? '',
      address: (customer as Client & { address?: string | null }).address ?? '',
      notes: customer.notes ?? '',
    })
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const payload = { ...formData, address: formData.address || null }

    if (editingCustomer) {
      const { data, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', editingCustomer.id)
        .select()
        .single()

      if (!error && data) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === data.id ? { ...data, address: (data as { address?: string }).address ?? null } : c))
        )
        setIsDialogOpen(false)
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const orgId = user
        ? (await supabase.from('profiles').select('org_id').eq('id', user.id).single()).data?.org_id ?? null
        : null
      if (!orgId) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...payload, org_id: orgId }])
        .select()
        .single()

      if (!error && data) {
        setCustomers((prev) => [{ ...data, address: (data as { address?: string }).address ?? null }, ...prev])
        setIsDialogOpen(false)
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer?')) return
    const supabase = createClient()
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) {
      setCustomers((prev) => prev.filter((c) => c.id !== id))
    }
  }

  function formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '')
    setFormData((prev) => ({ ...prev, phone: digits }))
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[var(--text-muted)] py-12">
                  No customers yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email || '—'}</TableCell>
                  <TableCell>{customer.phone ? formatPhoneNumber(customer.phone) : '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{(customer as Client & { address?: string }).address || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={crmPath(`/customers/${customer.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {customers.length === 0 ? (
          <div className="card p-6 text-center text-[var(--text-muted)]">
            No customers yet. Add one to get started.
          </div>
        ) : (
          customers.map((customer) => (
            <div
              key={customer.id}
              className="card p-4 border border-[var(--border)]"
            >
              <div className="font-medium mb-1">{customer.name}</div>
              <div className="text-sm text-[var(--text-muted)] mb-1">{customer.email || '—'}</div>
              <div className="text-sm text-[var(--text-muted)] mb-2">
                {customer.phone ? formatPhoneNumber(customer.phone) : '—'}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate mb-3">
                {(customer as Client & { address?: string }).address || '—'}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={crmPath(`/customers/${customer.id}`)}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(customer)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(customer.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1 text-red-600" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogClose onClick={() => setIsDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone ? formatPhoneNumber(formData.phone) : ''}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <AddressAutocomplete
                id="address"
                value={formData.address}
                onChange={(v) =>
                  setFormData((prev) => ({ ...prev, address: v }))
                }
                placeholder="Service address for mobile detailing"
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, company: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
