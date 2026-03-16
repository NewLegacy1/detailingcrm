'use client'

import { useState } from 'react'
import { Tag, Plus, Pencil, Trash2, Loader2, Percent, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'

export interface PromoRow {
  id: string
  name: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  usage_limit: number | null
  uses_per_customer: number | null
  used_count: number
  total_discount_amount: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

interface PromoCodesClientProps {
  initialPromos: PromoRow[]
}

export function PromoCodesClient({ initialPromos }: PromoCodesClientProps) {
  const [promos, setPromos] = useState<PromoRow[]>(initialPromos)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    usage_limit: '',
    uses_per_customer: '',
    is_active: true,
  })

  const openCreate = () => {
    setEditingId(null)
    setForm({
      name: '',
      code: '',
      discount_type: 'percent',
      discount_value: '',
      usage_limit: '',
      uses_per_customer: '',
      is_active: true,
    })
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (p: PromoRow) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      code: p.code,
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      usage_limit: p.usage_limit != null ? String(p.usage_limit) : '',
      uses_per_customer: (p as { uses_per_customer?: number | null }).uses_per_customer != null ? String((p as { uses_per_customer?: number | null }).uses_per_customer) : '',
      is_active: p.is_active,
    })
    setError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const name = form.name.trim()
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '')
    const discountType = form.discount_type
    const discountValue = parseFloat(form.discount_value)
    const usageLimit = form.usage_limit.trim() ? parseInt(form.usage_limit, 10) : null
    const usesPerCustomer = form.uses_per_customer.trim() ? parseInt(form.uses_per_customer, 10) : null

    if (!name || !code) {
      setError('Name and code are required.')
      return
    }
    if (discountType === 'percent' && (Number.isNaN(discountValue) || discountValue < 0 || discountValue > 100)) {
      setError('Percent discount must be between 0 and 100.')
      return
    }
    if (discountType === 'fixed' && (Number.isNaN(discountValue) || discountValue < 0)) {
      setError('Fixed discount must be 0 or greater.')
      return
    }
    if (usageLimit != null && (Number.isNaN(usageLimit) || usageLimit < 1)) {
      setError('Usage limit must be a positive number or empty.')
      return
    }
    if (usesPerCustomer != null && (Number.isNaN(usesPerCustomer) || usesPerCustomer < 1)) {
      setError('Uses per customer must be 1 or more, or empty.')
      return
    }

    setSaving(true)
    try {
      const url = editingId ? `/api/promo-codes/${editingId}` : '/api/promo-codes'
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId
        ? { name, code, discount_type: discountType, discount_value: discountValue, usage_limit: usageLimit, uses_per_customer: usesPerCustomer, is_active: form.is_active }
        : { name, code, discount_type: discountType, discount_value: discountValue, usage_limit: usageLimit, uses_per_customer: usesPerCustomer }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data.error as string) || 'Failed to save')
        return
      }
      if (editingId) {
        setPromos((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...data } : p)))
      } else {
        setPromos((prev) => [data as PromoRow, ...prev])
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promo code? It cannot be undone.')) return
    const res = await fetch(`/api/promo-codes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPromos((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const formatDiscount = (p: PromoRow) =>
    p.discount_type === 'percent'
      ? `${Number(p.discount_value)}% off`
      : `$${Number(p.discount_value).toFixed(2)} off`

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2" style={{ background: 'var(--accent)', color: 'white' }}>
          <Plus className="h-4 w-4" />
          Create promo code
        </Button>
      </div>

      {promos.length === 0 ? (
        <Card style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <CardContent className="pt-6">
            <p className="text-center text-[var(--text-2)]">No promo codes yet. Create one to use at checkout on your booking page.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((p) => (
            <Card key={p.id} style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text-1)]">{p.name}</p>
                    <p className="mt-1 font-mono text-sm text-[var(--text-2)]">{p.code}</p>
                    <p className="mt-1 text-sm text-[var(--accent)]">{formatDiscount(p)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="rounded p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="rounded p-1.5 text-[var(--text-2)] hover:bg-red-500/20 hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-3)]">
                  <span title="Times used">
                    <strong className="text-[var(--text-2)]">{p.used_count}</strong> uses
                  </span>
                  {p.usage_limit != null && (
                    <span>
                      limit {p.usage_limit}
                    </span>
                  )}
                  {(p as { uses_per_customer?: number | null }).uses_per_customer != null && (
                    <span title="Max per customer">
                      {(p as { uses_per_customer?: number }).uses_per_customer}/customer
                    </span>
                  )}
                  <span title="Total discount given">
                    ${Number(p.total_discount_amount).toFixed(2)} saved
                  </span>
                </div>
                {!p.is_active && (
                  <p className="mt-2 text-xs text-amber-500">Inactive — won’t apply at checkout</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <DialogHeader>
            <DialogTitle className="text-[var(--text-1)]">
              {editingId ? 'Edit promo code' : 'Create promo code'}
            </DialogTitle>
            <DialogClose onClick={() => setModalOpen(false)} />
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <div>
              <Label htmlFor="promo-name" style={{ color: 'var(--text-2)' }}>Name</Label>
              <Input
                id="promo-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Summer 20%"
                className="mt-1"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <Label htmlFor="promo-code" style={{ color: 'var(--text-2)' }}>Code (customers enter this at checkout)</Label>
              <Input
                id="promo-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                className="mt-1 font-mono"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                disabled={!!editingId}
              />
              {editingId && <p className="mt-1 text-xs text-[var(--text-3)]">Code cannot be changed after creation.</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: 'var(--text-2)' }}>Discount type</Label>
                <div className="mt-1 flex gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="discount_type"
                      checked={form.discount_type === 'percent'}
                      onChange={() => setForm((f) => ({ ...f, discount_type: 'percent' }))}
                      className="rounded"
                    />
                    <Percent className="h-4 w-4 text-[var(--text-3)]" />
                    <span className="text-sm">Percent</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="discount_type"
                      checked={form.discount_type === 'fixed'}
                      onChange={() => setForm((f) => ({ ...f, discount_type: 'fixed' }))}
                      className="rounded"
                    />
                    <DollarSign className="h-4 w-4 text-[var(--text-3)]" />
                    <span className="text-sm">Fixed</span>
                  </label>
                </div>
              </div>
              <div>
                <Label htmlFor="promo-value" style={{ color: 'var(--text-2)' }}>
                  {form.discount_type === 'percent' ? 'Percent off (0–100)' : 'Amount off ($)'}
                </Label>
                <Input
                  id="promo-value"
                  type="number"
                  min={form.discount_type === 'percent' ? 0 : 0}
                  max={form.discount_type === 'percent' ? 100 : undefined}
                  step={form.discount_type === 'percent' ? 1 : 0.01}
                  value={form.discount_value}
                  onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                  className="mt-1"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="promo-limit" style={{ color: 'var(--text-2)' }}>Usage limit (optional)</Label>
              <Input
                id="promo-limit"
                type="number"
                min={1}
                value={form.usage_limit}
                onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
                placeholder="Unlimited"
                className="mt-1"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div>
              <Label htmlFor="promo-per-customer" style={{ color: 'var(--text-2)' }}>Max uses per customer (optional)</Label>
              <Input
                id="promo-per-customer"
                type="number"
                min={1}
                value={form.uses_per_customer}
                onChange={(e) => setForm((f) => ({ ...f, uses_per_customer: e.target.value }))}
                placeholder="Unlimited"
                className="mt-1"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <p className="mt-1 text-xs text-[var(--text-3)]">Limit how many times one customer (same email/phone) can use this code.</p>
            </div>
            {editingId && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>Active (can be used at checkout)</span>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} style={{ borderColor: 'var(--border)' }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} style={{ background: 'var(--accent)', color: 'white' }}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
