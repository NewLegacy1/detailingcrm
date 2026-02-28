'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'

interface OrgSettings {
  invoice_due_days_default?: number
  invoice_memo_default?: string | null
  invoice_footer_default?: string | null
  invoice_number_prefix?: string | null
  invoice_tips_enabled?: boolean
  tax_enabled?: boolean
  tax_rate?: number
  travel_fee_enabled?: boolean
  travel_fee_amount?: number
  fee_handling?: string | null
  payment_methods?: string[] | null
}

interface PaymentsFormProps {
  stripeConnected: boolean
}

export function PaymentsForm({ stripeConnected }: PaymentsFormProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<OrgSettings>({
    invoice_due_days_default: 30,
    invoice_number_prefix: 'INV-',
    invoice_tips_enabled: false,
    tax_enabled: false,
    tax_rate: 0,
    travel_fee_enabled: false,
    travel_fee_amount: 0,
    fee_handling: 'included',
    payment_methods: ['card', 'cash'],
  })

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSettings((s) => ({ ...s, ...data }))
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripeConnected) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) setMessage({ type: 'success', text: 'Saved.' })
      else setMessage({ type: 'error', text: (await res.json()).error || 'Failed to save' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  const disabled = !stripeConnected

  if (loading) {
    return <div className="text-[var(--text-muted)] text-sm">Loading…</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Invoice defaults</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Default values for new invoices. Only available when Stripe is connected.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="invoice_due_days">Due date (days)</Label>
            <Input
              id="invoice_due_days"
              type="number"
              min={1}
              value={settings.invoice_due_days_default ?? 30}
              onChange={(e) => setSettings((s) => ({ ...s, invoice_due_days_default: parseInt(e.target.value, 10) || 30 }))}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="invoice_prefix">Number prefix</Label>
            <Input
              id="invoice_prefix"
              value={settings.invoice_number_prefix ?? 'INV-'}
              onChange={(e) => setSettings((s) => ({ ...s, invoice_number_prefix: e.target.value || 'INV-' }))}
              disabled={disabled}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="invoice_memo">Default memo</Label>
          <Input
            id="invoice_memo"
            value={settings.invoice_memo_default ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, invoice_memo_default: e.target.value || null }))}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="invoice_footer">Default footer</Label>
          <Input
            id="invoice_footer"
            value={settings.invoice_footer_default ?? ''}
            onChange={(e) => setSettings((s) => ({ ...s, invoice_footer_default: e.target.value || null }))}
            disabled={disabled}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.invoice_tips_enabled ?? false}
            onChange={(e) => setSettings((s) => ({ ...s, invoice_tips_enabled: e.target.checked }))}
            disabled={disabled}
            className="rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--text)]">Enable tips on invoices</span>
        </label>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Taxes & fees</h2>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.tax_enabled ?? false}
            onChange={(e) => setSettings((s) => ({ ...s, tax_enabled: e.target.checked }))}
            disabled={disabled}
            className="rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--text)]">Charge tax</span>
        </label>
        {settings.tax_enabled && (
          <div>
            <Label htmlFor="tax_rate">Tax rate (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              min={0}
              step={0.01}
              value={settings.tax_rate ?? 0}
              onChange={(e) => setSettings((s) => ({ ...s, tax_rate: parseFloat(e.target.value) || 0 }))}
              disabled={disabled}
            />
          </div>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.travel_fee_enabled ?? false}
            onChange={(e) => setSettings((s) => ({ ...s, travel_fee_enabled: e.target.checked }))}
            disabled={disabled}
            className="rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--text)]">Travel fee</span>
        </label>
        {settings.travel_fee_enabled && (
          <div>
            <Label htmlFor="travel_fee">Amount</Label>
            <Input
              id="travel_fee"
              type="number"
              min={0}
              step={0.01}
              value={settings.travel_fee_amount ?? 0}
              onChange={(e) => setSettings((s) => ({ ...s, travel_fee_amount: parseFloat(e.target.value) || 0 }))}
              disabled={disabled}
            />
          </div>
        )}
        <div>
          <Label htmlFor="fee_handling">Fee handling</Label>
          <select
            id="fee_handling"
            value={settings.fee_handling ?? 'included'}
            onChange={(e) => setSettings((s) => ({ ...s, fee_handling: e.target.value }))}
            disabled={disabled}
            className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="included">Included</option>
            <option value="added">Added to total</option>
            <option value="separate">Separate line</option>
          </select>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Payment methods</h2>
        <p className="text-sm text-[var(--text-muted)]">Accept these payment methods (placeholders for future use).</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(settings.payment_methods ?? []).includes('card')}
              onChange={(e) => {
                const methods = settings.payment_methods ?? []
                setSettings((s) => ({
                  ...s,
                  payment_methods: e.target.checked ? [...methods.filter((m) => m !== 'card'), 'card'] : methods.filter((m) => m !== 'card'),
                }))
              }}
              disabled={disabled}
              className="rounded border-[var(--border)]"
            />
            <span className="text-sm text-[var(--text)]">Card</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(settings.payment_methods ?? []).includes('cash')}
              onChange={(e) => {
                const methods = settings.payment_methods ?? []
                setSettings((s) => ({
                  ...s,
                  payment_methods: e.target.checked ? [...methods.filter((m) => m !== 'cash'), 'cash'] : methods.filter((m) => m !== 'cash'),
                }))
              }}
              disabled={disabled}
              className="rounded border-[var(--border)]"
            />
            <span className="text-sm text-[var(--text)]">Cash</span>
          </label>
        </div>
      </section>

      {!stripeConnected && (
        <p className="text-sm text-[var(--text-muted)]">
          <Link href={crmPath('/settings')} className="text-[var(--accent)] hover:underline">
            Connect Stripe
          </Link>
          {' '}to edit invoice and payment settings.
        </p>
      )}

      {stripeConnected && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {message && (
            <span className={message.type === 'success' ? 'text-green-500' : 'text-red-400'}>{message.text}</span>
          )}
        </div>
      )}
    </form>
  )
}
