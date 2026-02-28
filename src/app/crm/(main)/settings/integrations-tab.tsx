'use client'

import { CreditCard } from 'lucide-react'

export function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <div className="card p-6 max-w-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="section-title text-[var(--text)]">Stripe</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Connect your Stripe account to send invoices and accept payments from customers.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-white/5 transition-colors"
              disabled
            >
              Connect your Stripe account (coming soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
