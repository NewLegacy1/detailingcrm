'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { crmPath } from '@/lib/crm-path'

export function UpgradeToProButton() {
  const [loading, setLoading] = useState(false)
  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setLoading(false)
      if (!res.ok) alert(data.error || 'Failed to start checkout')
    } catch {
      setLoading(false)
      alert('Something went wrong')
    }
  }
  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="w-full sm:w-auto"
      style={{
        background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
        boxShadow: '0 4px 14px rgba(0,184,245,0.35)',
      }}
    >
      {loading ? 'Redirecting…' : 'Upgrade to Pro'}
    </Button>
  )
}

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setLoading(false)
      if (!res.ok) alert(data.error || 'Failed to open billing portal')
    } catch {
      setLoading(false)
      alert('Something went wrong')
    }
  }
  return (
    <Button variant="outline" onClick={handleClick} disabled={loading} className="w-full sm:w-auto">
      {loading ? 'Opening…' : 'Manage subscription'}
    </Button>
  )
}

/** Reusable link to the plan page for upsell CTAs across the app */
export const PLAN_PAGE_PATH = crmPath('/settings/plan')
