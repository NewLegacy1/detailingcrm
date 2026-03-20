'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Expand, X } from 'lucide-react'
import { nativeAuthStyles as na } from '@/components/login/native-auth-styles'
import {
  NativeOnboardingShell,
  OnboardingLoginHero,
  OnboardingPrimaryButton,
  OnboardingSecondaryButton,
} from '@/components/onboarding/NativeOnboardingShell'

const STARTER_STEPS = ['Services', 'Branding', 'Preview', 'Done'] as const
const PRO_STEPS = ['Branding', 'Services', 'Integrations', 'Preview', 'Done'] as const

const SERVICE_OPTIONS = [
  { id: 'interior', name: 'Interior Detail', duration: 120, price: 150 },
  { id: 'exterior', name: 'Exterior Wash', duration: 45, price: 35 },
  { id: 'full', name: 'Inside and Out Detail', duration: 180, price: 200 },
  { id: 'ceramic', name: 'Ceramic Coating', duration: 480, price: 800 },
]

function PollingView() {
  return (
    <NativeOnboardingShell showProgress={false}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
        <div
          className="h-10 w-10 rounded-full border-2 border-[#00b8f5] border-t-transparent animate-spin"
          aria-hidden
        />
        <OnboardingLoginHero line1="Payment" line2Accent="received." subtext="Setting up your account…" />
      </div>
    </NativeOnboardingShell>
  )
}

function OnboardingSetupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get('plan') === 'pro' ? 'pro' : 'starter'
  const steps = plan === 'pro' ? PRO_STEPS : STARTER_STEPS

  const [stepIndex, setStepIndex] = useState(0)
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [postPaymentPolling, setPostPaymentPolling] = useState(false)
  const initialStepAppliedRef = useRef(false)
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#00b8f5')
  const [brandAccentColor, setBrandAccentColor] = useState('#00b8f5')
  const [saving, setSaving] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [priFocus, setPriFocus] = useState(false)
  const [accFocus, setAccFocus] = useState(false)

  const stepId = steps[stepIndex]
  const progress = ((stepIndex + 1) / steps.length) * 100
  const previewWide = stepId === 'Preview'

  useEffect(() => {
    let cancelled = false
    fetch('/api/onboarding/me')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setSlug(d.slug ?? null)
        const hasCrm = Boolean(d.hasCrmAccess)
        if (d.onboardingComplete) {
          router.replace('/crm/dashboard')
          return
        }
        if (hasCrm && searchParams.get('plan')) {
          router.replace('/crm/dashboard')
          return
        }
        if (searchParams.get('plan') && !hasCrm) {
          setPostPaymentPolling(true)
        }
        if (initialStepAppliedRef.current) return
        initialStepAppliedRef.current = true
        const savedStep = typeof d.onboardingStep === 'string' ? d.onboardingStep.trim() : null
        if (savedStep) {
          const idx = (steps as readonly string[]).indexOf(savedStep)
          if (idx >= 0) setStepIndex(idx)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!postPaymentPolling) return
    const maxAttempts = 20
    let attempts = 0
    const interval = setInterval(async () => {
      attempts += 1
      try {
        const r = await fetch('/api/onboarding/me')
        const d = await r.json()
        if (d.hasCrmAccess) {
          router.replace('/crm/dashboard')
          return
        }
      } catch {
        /* ignore */
      }
      if (attempts >= maxAttempts) {
        setPostPaymentPolling(false)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [postPaymentPolling, router])

  const saveProgress = useCallback(async (step: string, complete = false) => {
    setSaving(true)
    await fetch('/api/onboarding/save', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_step: step, onboarding_complete: complete }),
    })
    setSaving(false)
  }, [])

  const goNext = useCallback(async () => {
    if (stepIndex >= steps.length - 1) return
    const nextStep = steps[stepIndex + 1] ?? 'complete'
    await saveProgress(nextStep)
    setStepIndex((i) => i + 1)
  }, [stepIndex, steps, saveProgress])

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return
    setStepIndex((i) => i - 1)
  }, [stepIndex])

  const handleDone = useCallback(async () => {
    await saveProgress('complete', true)
    router.push('/crm/dashboard')
  }, [router, saveProgress])

  const footer = (
    <div style={{ ...na.legalRow, marginTop: 24, paddingBottom: 8 }}>
      <Link href="/privacy" style={na.legalLink}>
        Privacy
      </Link>
      <Link href="/terms" style={na.legalLink}>
        Terms & Conditions
      </Link>
    </div>
  )

  if (loading) {
    return (
      <NativeOnboardingShell showProgress={false} footer={footer}>
        <p style={{ color: '#5a6a80' }}>Loading…</p>
      </NativeOnboardingShell>
    )
  }

  if (postPaymentPolling) {
    return <PollingView />
  }

  return (
    <NativeOnboardingShell
      progressPercent={progress}
      stepLabel={`Step ${stepIndex + 1} of ${steps.length}`}
      contentMaxWidth={previewWide ? 720 : 440}
      footer={footer}
    >
      {stepId === 'Services' && (
        <>
          <OnboardingLoginHero
            line1="Default"
            line2Accent="services."
            subtext="Your account includes these services. You can add or edit more in the CRM after you finish."
          />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SERVICE_OPTIONS.map((s) => (
              <li
                key={s.id}
                style={{
                  ...na.onboardingGlassRow,
                  margin: 0,
                }}
              >
                <Check className="h-4 w-4 shrink-0" style={{ color: '#00b8f5' }} aria-hidden />
                <span style={{ fontWeight: 600, color: '#eef0f2' }}>{s.name}</span>
                <span style={{ color: '#5a6a80', fontSize: '0.88rem', marginLeft: 'auto' }}>
                  {s.duration} min · ${s.price}
                </span>
              </li>
            ))}
          </ul>
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack} disabled={stepIndex === 0}>
              Back
            </OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext}>
              Continue
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Branding' && plan === 'starter' && (
        <>
          <OnboardingLoginHero
            line1="Branding"
            line2Accent="Pro."
            subtext="Logo, colours, and layout customisation are available on the Pro plan."
          />
          <div
            style={{
              ...na.onboardingGlassRow,
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 16,
              padding: '28px 20px',
            }}
          >
            <p style={{ color: '#5a6a80', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              Upgrade anytime to unlock a branded booking page and full CRM theming.
            </p>
            <Link
              href="/onboarding?plan=pro"
              style={{
                ...na.onboardingBtnSecondary,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: 'rgba(0,184,245,0.4)',
                color: '#00b8f5',
              }}
            >
              Upgrade to Pro
            </Link>
          </div>
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext}>
              Continue
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Branding' && plan === 'pro' && (
        <>
          <OnboardingLoginHero
            line1="Booking"
            line2Accent="colours."
            subtext="Primary and accent colours for your public booking page. You can change them anytime in Settings → Branding."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={na.fieldLabel}>Primary color</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <input
                  type="color"
                  value={brandPrimaryColor}
                  onChange={(e) => setBrandPrimaryColor(e.target.value)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: '1px solid rgba(0,184,245,0.25)',
                    cursor: 'pointer',
                  }}
                />
                <input
                  className="do-native-auth-input"
                  value={brandPrimaryColor}
                  onChange={(e) => setBrandPrimaryColor(e.target.value)}
                  placeholder="#00b8f5"
                  onFocus={() => setPriFocus(true)}
                  onBlur={() => setPriFocus(false)}
                  style={{
                    ...na.fieldInputNoIcon,
                    flex: 1,
                    ...(priFocus ? na.fieldInputFocus : {}),
                  }}
                />
              </div>
            </div>
            <div>
              <label style={na.fieldLabel}>Accent color</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <input
                  type="color"
                  value={brandAccentColor}
                  onChange={(e) => setBrandAccentColor(e.target.value)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: '1px solid rgba(0,184,245,0.25)',
                    cursor: 'pointer',
                  }}
                />
                <input
                  className="do-native-auth-input"
                  value={brandAccentColor}
                  onChange={(e) => setBrandAccentColor(e.target.value)}
                  placeholder="#00b8f5"
                  onFocus={() => setAccFocus(true)}
                  onBlur={() => setAccFocus(false)}
                  style={{
                    ...na.fieldInputNoIcon,
                    flex: 1,
                    ...(accFocus ? na.fieldInputFocus : {}),
                  }}
                />
              </div>
            </div>
          </div>
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton
              onClick={async () => {
                setSaving(true)
                try {
                  await fetch('/api/onboarding/branding', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      primary_color: brandPrimaryColor?.trim() || null,
                      accent_color: brandAccentColor?.trim() || null,
                    }),
                  })
                  await goNext()
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Continue'}
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Integrations' && (
        <>
          <OnboardingLoginHero
            line1="Connect"
            line2Accent="later."
            subtext="Stripe and Google Calendar can be connected in the CRM when you're ready."
          />
          <div style={{ ...na.onboardingGlassRow, flexDirection: 'column', alignItems: 'stretch' }}>
            <p style={{ color: '#5a6a80', fontSize: '0.92rem', margin: 0, lineHeight: 1.55 }}>
              Go to <strong style={{ color: '#dce6ec' }}>Settings → Payments</strong> for Stripe and{' '}
              <strong style={{ color: '#dce6ec' }}>Settings → Schedule</strong> for Google Calendar.
            </p>
          </div>
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext}>
              Continue
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Preview' && (
        <>
          <OnboardingLoginHero
            line1="Booking"
            line2Accent="preview."
            subtext="This is how clients see you. Share the link when you're ready."
          />
          {slug ? (
            <>
              <div
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(0,184,245,0.2)',
                  overflow: 'hidden',
                  background: 'rgba(12,16,24,0.35)',
                }}
              >
                <iframe
                  title="Booking page preview"
                  src={`/book/${encodeURIComponent(slug)}`}
                  className="w-full h-[400px] border-0"
                />
              </div>
              <button
                type="button"
                onClick={() => setPreviewExpanded(true)}
                style={{
                  ...na.onboardingBtnSecondary,
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Expand className="h-4 w-4" />
                Expand preview
              </button>
              {previewExpanded && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: 'rgba(0,0,0,0.65)' }}
                  onClick={() => setPreviewExpanded(false)}
                >
                  <div
                    className="relative w-full max-w-4xl flex flex-col overflow-hidden"
                    style={{
                      height: '85vh',
                      borderRadius: 16,
                      border: '1px solid rgba(0,184,245,0.2)',
                      background: '#0c1018',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3 shrink-0"
                      style={{ borderBottom: '1px solid rgba(0,184,245,0.12)' }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#eef0f2' }}>
                        Booking preview
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewExpanded(false)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9999,
                          border: '1px solid rgba(0,184,245,0.2)',
                          background: 'rgba(12,16,24,0.6)',
                          color: '#c8d5e8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <iframe
                        title="Booking page preview (expanded)"
                        src={`/book/${encodeURIComponent(slug)}`}
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#5a6a80' }}>No booking URL set. You can set it in Settings → Branding.</p>
          )}
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext}>
              Continue
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Done' && (
        <>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <Check className="h-8 w-8" style={{ color: '#22c55e' }} aria-hidden />
          </div>
          <OnboardingLoginHero
            line1="You're"
            line2Accent="all set."
            subtext="Your booking page is live. Head to the dashboard to manage jobs, customers, and more."
          />
          <OnboardingPrimaryButton onClick={handleDone} disabled={saving}>
            {saving ? 'Saving…' : 'Go to Dashboard'}
            <span style={na.btnArrow}>→</span>
          </OnboardingPrimaryButton>
        </>
      )}
    </NativeOnboardingShell>
  )
}

export default function OnboardingSetupPage() {
  return (
    <Suspense
      fallback={
        <NativeOnboardingShell showProgress={false}>
          <p style={{ color: '#5a6a80' }}>Loading…</p>
        </NativeOnboardingShell>
      }
    >
      <OnboardingSetupContent />
    </Suspense>
  )
}
