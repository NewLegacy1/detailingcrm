'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { nativeAuthStyles as na } from '@/components/login/native-auth-styles'
import {
  NativeOnboardingShell,
  OnboardingPrimaryButton,
  OnboardingStepHeadline,
} from '@/components/onboarding/NativeOnboardingShell'

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
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <path
        d="M2.5 7.5L6 11L12.5 4"
        stroke={accent ? '#22c55e' : '#00b8f5'}
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
      <li className="flex items-start gap-2.5 leading-relaxed" style={{ color: '#c8d5e4', fontSize: '0.9rem' }}>
        <Check accent={accent} />
        <span>{feature}</span>
      </li>
    )
  }
  return (
    <li className="flex items-start gap-2.5 leading-relaxed" style={{ color: '#c8d5e4', fontSize: '0.9rem' }}>
      <Check accent={accent} />
      <span className="flex flex-col gap-0.5">
        <span>{feature.text}</span>
        <span
          className="text-[11px] font-medium rounded-full px-2 py-0.5 inline-block w-fit whitespace-nowrap"
          style={{
            background: 'rgba(167,139,250,0.12)',
            color: '#a78bfa',
            border: '1px solid rgba(167,139,250,0.25)',
          }}
        >
          {feature.note}
        </span>
      </span>
    </li>
  )
}

const planShell = {
  borderRadius: 20,
  border: '1px solid rgba(0,184,245,0.14)',
  background: 'rgba(12,16,24,0.4)',
  padding: '26px 22px',
  display: 'flex',
  flexDirection: 'column' as const,
  height: '100%',
}

export default function OnboardingPaywallPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

  async function handleSelect(planId: 'starter' | 'pro') {
    setError(null)
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        setLoading(null)
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError('No redirect URL received')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(null)
  }

  const footer = (
    <>
      <p style={{ ...na.onboardingFooterNote, marginTop: 20 }}>
        By continuing you agree to our{' '}
        <Link href="/crm/legal/terms" style={na.signupLink}>
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/crm/legal/privacy" style={na.signupLink}>
          Privacy
        </Link>
        .
      </p>
      <div style={{ ...na.legalRow, marginTop: 8, paddingBottom: 8 }}>
        <Link href="/privacy" style={na.legalLink}>
          Privacy
        </Link>
        <Link href="/terms" style={na.legalLink}>
          Terms & Conditions
        </Link>
      </div>
    </>
  )

  return (
    <NativeOnboardingShell showProgress={false} contentMaxWidth={1100} footer={footer}>
      <OnboardingStepHeadline line1="Simple," line2Accent="pricing." />
      <p style={na.onboardingLead}>
        Pays for itself the moment you stop a single no-show.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'flex-start',
          marginBottom: 20,
        }}
      >
        {['500+ detailers', 'Cancel anytime', 'Stripe-secured'].map((t) => (
          <span
            key={t}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(90,106,128,0.95)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: '#00b8f5' }}>✓</span> {t}
          </span>
        ))}
      </div>

      {error ? <div style={{ ...na.authError, marginBottom: 16 }}>{error}</div> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          width: '100%',
        }}
      >
        {/* Starter */}
        <div style={planShell}>
          <p style={{ ...na.fieldLabel, marginBottom: 12 }}>Starter</p>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b', paddingBottom: 4 }}>$</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#eef0f2', letterSpacing: '-2px', lineHeight: 1 }}>
                75
              </span>
              <span style={{ fontSize: 14, color: '#64748b', paddingBottom: 6 }}>/mo CAD</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#5a6a80', margin: 0, lineHeight: 1.45 }}>
              Everything a solo detailer needs to look professional and stay organized.
            </p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {STARTER_FEATURES.map((f, i) => (
              <FeatureItem key={i} feature={f} />
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <OnboardingPrimaryButton
              onClick={() => handleSelect('starter')}
              disabled={!!loading}
              style={{ width: '100%', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)' }}
            >
              {loading === 'starter' ? 'Redirecting…' : 'Get Started'}
            </OnboardingPrimaryButton>
          </div>
        </div>

        {/* Pro */}
        <div
          style={{
            ...planShell,
            border: '1px solid rgba(0,184,245,0.38)',
            background: 'rgba(0,184,245,0.06)',
            boxShadow: '0 0 40px rgba(0,184,245,0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                borderRadius: 9999,
                border: '1px solid rgba(0,184,245,0.35)',
                color: '#00b8f5',
                background: 'rgba(0,184,245,0.08)',
              }}
            >
              Most popular
            </span>
          </div>
          <p style={{ ...na.fieldLabel, marginBottom: 12, color: '#00b8f5' }}>Pro</p>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b', paddingBottom: 4 }}>$</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: '#eef0f2', letterSpacing: '-2px', lineHeight: 1 }}>
                100
              </span>
              <span style={{ fontSize: 14, color: '#64748b', paddingBottom: 6 }}>/mo CAD</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#5a6a80', margin: 0, lineHeight: 1.45 }}>
              For detailers serious about growth, retention, and a fully automated business.
            </p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {PRO_FEATURES.map((f, i) => (
              <FeatureItem key={i} feature={f} accent />
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <OnboardingPrimaryButton onClick={() => handleSelect('pro')} disabled={!!loading}>
              {loading === 'pro' ? 'Redirecting…' : 'Get Started'}
              {loading !== 'pro' ? <span style={na.btnArrow}>→</span> : null}
            </OnboardingPrimaryButton>
          </div>
        </div>

        {/* Enterprise */}
        <div style={planShell}>
          <p style={{ ...na.fieldLabel, marginBottom: 12 }}>Enterprise</p>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 40, fontWeight: 800, color: '#eef0f2', letterSpacing: '-2px', margin: 0, lineHeight: 1.1 }}>
              Let&apos;s talk
            </p>
            <p style={{ fontSize: '0.9rem', color: '#5a6a80', marginTop: 10, lineHeight: 1.45 }}>
              For multi-location shops, fleet operators, and franchises that need a custom setup.
            </p>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {ENT_FEATURES.map((f, i) => (
              <FeatureItem key={i} feature={f} />
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <a
              href="mailto:hello@detailops.io?subject=Enterprise%20inquiry"
              style={{
                ...na.onboardingBtnSecondary,
                width: '100%',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: 'rgba(0,184,245,0.45)',
                color: '#00b8f5',
              }}
            >
              Contact us
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'flex-start',
          marginTop: 24,
        }}
      >
        {[
          { icon: '🔒', text: 'Secure payment via Stripe' },
          { icon: '↩', text: 'Cancel anytime — no lock-in' },
          { icon: '💬', text: 'Support included on all plans' },
        ].map(({ icon, text }) => (
          <span key={text} style={{ fontSize: 12, color: 'rgba(90,106,128,0.75)' }}>
            <span aria-hidden>{icon}</span> {text}
          </span>
        ))}
      </div>
    </NativeOnboardingShell>
  )
}
