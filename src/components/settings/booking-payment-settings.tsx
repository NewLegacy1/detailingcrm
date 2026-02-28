'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CreditCard } from 'lucide-react'

export type BookingPaymentMode = 'none' | 'deposit' | 'card_on_file'

interface BookingPaymentSettingsProps {
  isPro: boolean
  stripeConnected: boolean
}

export function BookingPaymentSettings({ isPro, stripeConnected }: BookingPaymentSettingsProps) {
  const [mode, setMode] = useState<BookingPaymentMode>('none')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.booking_payment_mode === 'deposit' || data?.booking_payment_mode === 'card_on_file') {
          setMode(data.booking_payment_mode)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_payment_mode: mode }),
      })
      if (res.ok) setMessage({ type: 'success', text: 'Saved.' })
      else setMessage({ type: 'error', text: (await res.json()).error || 'Failed to save' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  if (!isPro) return null

  if (loading) {
    return <div className="text-[var(--text-muted)] text-sm">Loading…</div>
  }

  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-[var(--text-2)]" />
        <h2 className="section-title text-[var(--text)]">Booking checkout payments</h2>
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        When customers book online, require either a deposit at checkout or save their card for later. Only available on the Pro plan. Turn off to keep the current &quot;book without payment&quot; flow.
      </p>

      <div className="space-y-3">
        <Label className="text-[var(--text)]">Require payment at booking</Label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--surface-1)]">
            <input
              type="radio"
              name="booking_payment_mode"
              checked={mode === 'none'}
              onChange={() => setMode('none')}
              className="text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text)]">Off — book without payment</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--surface-1)]">
            <input
              type="radio"
              name="booking_payment_mode"
              checked={mode === 'deposit'}
              onChange={() => setMode('deposit')}
              disabled={!stripeConnected}
              className="text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text)]">Deposit required — customer pays a deposit at checkout</span>
            {!stripeConnected && (
              <span className="text-xs text-[var(--text-muted)]">Connect Stripe above to enable.</span>
            )}
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--surface-1)]">
            <input
              type="radio"
              name="booking_payment_mode"
              checked={mode === 'card_on_file'}
              onChange={() => setMode('card_on_file')}
              disabled={!stripeConnected}
              className="text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text)]">Card on file — save customer&apos;s card at checkout, charge later</span>
            {!stripeConnected && (
              <span className="text-xs text-[var(--text-muted)]">Connect Stripe above to enable.</span>
            )}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {message && (
          <span className={message.type === 'success' ? 'text-green-500' : 'text-red-400'}>{message.text}</span>
        )}
      </div>
    </section>
  )
}
