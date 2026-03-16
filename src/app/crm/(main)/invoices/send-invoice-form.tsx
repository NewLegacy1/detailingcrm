'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-picker'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Calendar } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_amount: number
  amount: number
  isMonthly?: boolean
}

interface SendInvoiceFormProps {
  clients: { id: string; name: string; email: string | null }[]
  initialCustomerId?: string
  initialJobId?: string
  initialLineItems?: { description: string; quantity: number; unit_amount: number; amount: number }[]
  onSuccess: (invoice: { id: string; client_id: string; job_id?: string | null; status: string; currency: string; amount_total: number; due_date: string | null; created_at: string; stripe_invoice_id: string | null; client?: { id: string; name: string; email: string | null } }) => void
  onCancel: () => void
}

export function SendInvoiceForm({ clients, initialCustomerId, initialJobId, initialLineItems, onSuccess, onCancel }: SendInvoiceFormProps) {
  const [clientId, setClientId] = useState(initialCustomerId ?? '')
  const [jobId, setJobId] = useState(initialJobId ?? '')
  const [currency, setCurrency] = useState('usd')
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [footer, setFooter] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialLineItems?.length
      ? initialLineItems.map((item) => ({ ...item, isMonthly: false }))
      : [{ description: '', quantity: 1, unit_amount: 0, amount: 0, isMonthly: false }]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateLineItem(index: number, field: keyof LineItem, value: string | number | boolean) {
    const next = lineItems.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_amount') {
        updated.amount = Number(updated.quantity) * Number(updated.unit_amount)
      }
      return updated
    })
    setLineItems(next)
  }

  function addLine() {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_amount: 0, amount: 0, isMonthly: false }])
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const total = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_amount), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!clientId) {
      setError('Select a client')
      return
    }
    const items = lineItems.filter((row) => row.description.trim() && row.unit_amount >= 0)
    if (items.length === 0) {
      setError('Add at least one line item with description and amount')
      return
    }
    const payload = {
      clientId,
      jobId: jobId || undefined,
      currency,
      dueDate: dueDate || null,
      memo: memo.trim() || null,
      footer: footer.trim() || null,
      lineItems: items.map((row) => ({
        description: row.description.trim(),
        quantity: row.quantity,
        unit_amount: row.unit_amount,
        amount: row.quantity * row.unit_amount,
        isMonthly: row.isMonthly || false,
      })),
    }
    setLoading(true)
    try {
      const res = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send invoice')
        setLoading(false)
        return
      }
      onSuccess(data.invoice)
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
      )}

      <div>
        <Label htmlFor="clientId">Client *</Label>
        <select
          id="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Line items *</Label>
        <div className="mt-2 space-y-2">
          {lineItems.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] p-2">
              <Input
                placeholder="Description"
                value={row.description}
                onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                className="flex-1 min-w-[120px]"
              />
              <Input
                type="number"
                min={1}
                placeholder="Qty"
                value={row.quantity || ''}
                onChange={(e) => updateLineItem(i, 'quantity', parseInt(e.target.value, 10) || 0)}
                className="w-16"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Unit $"
                value={row.unit_amount || ''}
                onChange={(e) => updateLineItem(i, 'unit_amount', parseFloat(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-[var(--text-muted)] text-sm w-14">= {(row.quantity * row.unit_amount).toFixed(2)}</span>
              <Button
                type="button"
                variant={row.isMonthly ? "default" : "outline"}
                size="sm"
                onClick={() => updateLineItem(i, 'isMonthly', !row.isMonthly)}
                className={row.isMonthly ? "bg-green-600 hover:bg-green-700" : ""}
                title={row.isMonthly ? "Monthly recurring - click to remove" : "Click to make monthly recurring"}
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" />
            Add line
          </Button>
        </div>
      </div>

      <div className="flex justify-between text-sm font-medium text-[var(--text)]">
        <span>Total</span>
        <span>{currency.toUpperCase()} {total.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="usd">USD</option>
            <option value="cad">CAD</option>
            <option value="eur">EUR</option>
            <option value="gbp">GBP</option>
          </select>
        </div>
        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <DateInput
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="memo">Memo (customer-facing)</Label>
        <Textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="e.g. Payment terms: Net 30"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="footer">Footer (optional)</Label>
        <Input
          id="footer"
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder="e.g. Thank you for your business"
          className="mt-1"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send invoice'}
        </Button>
      </div>
    </form>
  )
}
