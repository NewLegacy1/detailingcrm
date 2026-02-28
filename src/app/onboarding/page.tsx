'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Feature = string | { text: string; note: string }

const STARTER_FEATURES: Feature[] = [
  'Professional booking page',
  'Up to 60 bookings / month',
  'Stripe payments & deposits',
  'Client history & notes',
  'Custom services',
  'Dashboard',
]

const PRO_FEATURES: Feature[] = [
  'Everything in Starter',
  'Unlimited bookings',
  'Automated reminders & follow-ups',
  'Automated review requests',
  { text: 'Reactivation campaigns', note: '$0.25 / msg — SMS & email' },
  'Deposits & card on file',
  'Branded booking page & CRM',
  'Team access',
]

const ENT_FEATURES: Feature[] = [
  'Everything in Pro',
  'Multi-location support',
  'White-label branding',
  'Dedicated account manager',
  'Custom integrations',
  'Volume pricing',
  'Priority SLA & support',
]

function Check({ accent = false }: { accent?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M2.5 7.5L6 11L12.5 4"
        stroke={accent ? '#00d47e' : '#00b8f5'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FeatureItem({ feature, accent }: { feature: Feature; accent?: boolean }) {
  if (typeof feature === 'string') {
    return (
      <li className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: '#c8d5e4' }}>
        <Check accent={accent} />
        <span>{feature}</span>
      </li>
    )
  }
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: '#c8d5e4' }}>
      <Check accent={accent} />
      <span className="flex flex-col gap-0.5">
        <span>{feature.text}</span>
        <span
          className="text-[11px] font-medium rounded px-1.5 py-0.5 inline-block w-fit whitespace-nowrap"
          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
        >
          {feature.note}
        </span>
      </span>
    </li>
  )
}

export default function OnboardingPaywallPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  // Keep content at top: prevent scroll restoration from showing bottom of page
  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

  async function handleSelect(planId: 'starter' | 'pro') {
    setError(null)
    setLoading(planId)
    try {
      const res  = await fetch('/api/stripe/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); setLoading(null); return }
      if (data.url) { window.location.href = data.url; return }
      setError('No redirect URL received')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(null)
  }

  async function handleSkipForTesting() {
    setError(null)
    setLoading('skip')
    try {
      const res  = await fetch('/api/onboarding/skip-for-testing', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Skip failed'); setLoading(null); return }
      window.location.href = data.redirect ?? '/crm/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(null)
  }

  return (
    <div
      className="auth-hero-bg auth-hero-bg--no-glow min-h-screen w-full flex flex-col items-center justify-start px-4 pt-3 pb-14"
      style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="text-center mb-2 max-w-xl relative z-[1] pt-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2" style={{ color: '#eef0f2', letterSpacing: '-0.5px' }}>
          Simple, transparent pricing.
        </h1>
        <p className="text-base font-light" style={{ color: '#64748b' }}>
          Pays for itself the moment you stop a single no-show.
        </p>
      </div>

      {/* Social proof strip */}
      <div className="flex items-center gap-5 mb-5 flex-wrap justify-center relative z-[1]">
        {['500+ detailers', 'Cancel anytime', 'Stripe-secured'].map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#64748b' }}>
            <span style={{ color: '#00b8f5' }}>✓</span> {t}
          </span>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl px-5 py-3 text-sm max-w-md w-full"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Pricing cards */}
      <div className="w-full max-w-[1060px] grid grid-cols-1 md:grid-cols-3 gap-5 items-start relative z-[1]">

        {/* ── STARTER ── */}
        <div
          className="rounded-2xl flex flex-col h-full"
          style={{ background: '#101620', border: '1px solid rgba(255,255,255,0.07)', padding: '28px 26px' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>Starter</p>

          <div className="mb-5">
            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-[13px] font-semibold" style={{ color: '#64748b', alignSelf: 'flex-start', paddingTop: '8px' }}>$</span>
              <span className="font-extrabold leading-none" style={{ fontSize: '64px', color: '#eef0f2', letterSpacing: '-2px' }}>75</span>
              <span className="text-sm font-normal mb-2" style={{ color: '#64748b' }}>/mo CAD</span>
            </div>
            <p className="text-sm font-light leading-snug" style={{ color: '#64748b' }}>
              Everything a solo detailer needs to look professional and stay organized.
            </p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {STARTER_FEATURES.map((f, i) => <FeatureItem key={i} feature={f} />)}
          </ul>

          <button
            type="button"
            onClick={() => handleSelect('starter')}
            disabled={!!loading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#eef0f2' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
          >
            {loading === 'starter' ? 'Redirecting…' : 'Get Started'}
          </button>
        </div>

        {/* ── PRO ── */}
        <div
          className="rounded-2xl flex flex-col relative"
          style={{
            background: '#101620',
            border: '1px solid rgba(0,184,245,0.35)',
            padding: '28px 26px',
            boxShadow: '0 0 0 1px rgba(0,184,245,0.15), 0 20px 60px rgba(0,184,245,0.08)',
          }}
        >
          {/* Badge */}
          <div className="flex justify-center mb-4">
            <span
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(0,184,245,0.1)', border: '1px solid rgba(0,184,245,0.3)', color: '#00b8f5' }}
            >
              🔥 Most Popular
            </span>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#00b8f5' }}>Pro</p>

          <div className="mb-5">
            <div className="flex items-end gap-1.5 mb-1">
              <span className="text-[13px] font-semibold" style={{ color: '#64748b', alignSelf: 'flex-start', paddingTop: '8px' }}>$</span>
              <span className="font-extrabold leading-none" style={{ fontSize: '64px', color: '#eef0f2', letterSpacing: '-2px' }}>100</span>
              <span className="text-sm font-normal mb-2" style={{ color: '#64748b' }}>/mo CAD</span>
            </div>
            <p className="text-sm font-light leading-snug" style={{ color: '#64748b' }}>
              For detailers serious about growth, retention, and a fully automated business.
            </p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {PRO_FEATURES.map((f, i) => <FeatureItem key={i} feature={f} accent />)}
          </ul>

          <button
            type="button"
            onClick={() => handleSelect('pro')}
            disabled={!!loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: '#00b8f5', color: '#07090c', boxShadow: '0 4px 24px rgba(0,184,245,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#33c9ff'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00b8f5'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {loading === 'pro' ? 'Redirecting…' : 'Get Started'}
          </button>
        </div>

        {/* ── ENTERPRISE ── */}
        <div
          className="rounded-2xl flex flex-col h-full"
          style={{ background: '#101620', border: '1px solid rgba(255,255,255,0.07)', padding: '28px 26px' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>Enterprise</p>

          <div className="mb-5">
            <div className="mb-3">
              <span className="font-extrabold leading-none block" style={{ fontSize: '48px', color: '#eef0f2', letterSpacing: '-2px', lineHeight: '1.1' }}>
                Let&apos;s talk
              </span>
            </div>
            <p className="text-sm font-light leading-snug" style={{ color: '#64748b' }}>
              For multi-location shops, fleet operators, and franchises that need a custom setup.
            </p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {ENT_FEATURES.map((f, i) => <FeatureItem key={i} feature={f} />)}
          </ul>

          <a
            href="mailto:hello@detailops.io?subject=Enterprise%20inquiry"
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-center block transition-all"
            style={{ background: 'transparent', border: '1px solid rgba(0,184,245,0.35)', color: '#00b8f5' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,184,245,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Contact Us
          </a>
        </div>
      </div>

      {/* Trust row */}
      <div className="mt-10 flex flex-wrap gap-6 justify-center items-center">
        {[
          { icon: '🔒', text: 'Secure payment via Stripe' },
          { icon: '↩', text: 'Cancel anytime — no lock-in' },
          { icon: '💬', text: 'Support included on all plans' },
        ].map(({ icon, text }) => (
          <span key={text} className="flex items-center gap-2 text-xs" style={{ color: '#3d4f5e' }}>
            <span>{icon}</span> {text}
          </span>
        ))}
      </div>

      {/* Skip for testing (e.g. on Vercel) */}
      <button
        type="button"
        onClick={handleSkipForTesting}
        disabled={!!loading}
        className="mt-8 text-xs underline disabled:opacity-50"
        style={{ color: '#3d4f5e' }}
      >
        {loading === 'skip' ? 'Skipping…' : 'Skip for testing'}
      </button>

      <p className="mt-6 text-xs text-center" style={{ color: '#3d4f5e' }}>
        By continuing you agree to our{' '}
        <Link href="/crm/legal/terms" className="underline hover:no-underline" style={{ color: '#64748b' }}>Terms</Link>
        {' '}and{' '}
        <Link href="/crm/legal/privacy" className="underline hover:no-underline" style={{ color: '#64748b' }}>Privacy</Link>.
      </p>
    </div>
  )
}
