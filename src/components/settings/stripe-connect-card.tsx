'use client'

import { useState, useEffect } from 'react'
import { CreditCard, ExternalLink, RefreshCw, Unplug, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StripeStatus {
  connected: boolean
  accountId: string | null
  email: string | null
}

export function StripeConnectCard() {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stripe/status')
      .then((r) => (r.ok ? r.json() : { connected: false, accountId: null, email: null }))
      .then((data) => setStatus(data))
      .catch(() => setStatus({ connected: false, accountId: null, email: null }))
      .finally(() => setLoading(false))
  }, [])

  async function handleConnect() {
    setActionLoading('connect')
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || 'Failed to connect')
    } catch {
      setError('Request failed')
    }
    setActionLoading(null)
  }

  async function handleManage() {
    setActionLoading('manage')
    try {
      const res = await fetch('/api/stripe/manage', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      setActionLoading(null)
    } catch {
      setActionLoading(null)
    }
  }

  async function handleReconnect() {
    setActionLoading('reconnect')
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || 'Failed to reconnect')
    } catch {
      setError('Request failed')
    }
    setActionLoading(null)
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Stripe? You will need to reconnect to send invoices via Stripe.')) return
    setActionLoading('disconnect')
    try {
      await fetch('/api/stripe/disconnect', { method: 'POST' })
      setStatus({ connected: false, accountId: null, email: null })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="card p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        <span className="text-[var(--text-muted)]">Loading Stripe status…</span>
      </div>
    )
  }

  const connected = status?.connected ?? false

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
          <CreditCard className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="section-title text-[var(--text)] flex items-center gap-2">
            Stripe
            {connected ? (
              <span className="text-sm font-normal text-green-500">Connected</span>
            ) : (
              <span className="text-sm font-normal text-amber-500">Not connected</span>
            )}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {connected
              ? 'Send invoices and accept payments. Manage your Stripe Express account below.'
              : 'Connect your Stripe account to send invoices and accept payments.'}
          </p>
          {connected && (status?.email || status?.accountId) && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {status.email && <span>{status.email}</span>}
              {status.accountId && <span className="ml-2">({status.accountId})</span>}
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {!connected && (
              <Button onClick={handleConnect} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                {actionLoading === 'connect' && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect Stripe
              </Button>
            )}
            {connected && (
              <>
                <Button variant="outline" onClick={handleManage} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                  {actionLoading === 'manage' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Manage in Stripe
                </Button>
                <Button variant="outline" onClick={handleReconnect} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                  {actionLoading === 'reconnect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Reconnect
                </Button>
                <Button variant="outline" onClick={handleDisconnect} disabled={!!actionLoading} className="inline-flex items-center gap-2">
                  {actionLoading === 'disconnect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
