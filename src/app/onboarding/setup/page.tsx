'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Check, Expand, X } from 'lucide-react'

const STARTER_STEPS = ['Services', 'Branding', 'Preview', 'Done'] as const
const PRO_STEPS = ['Branding', 'Services', 'Integrations', 'Preview', 'Done'] as const

const SERVICE_OPTIONS = [
  { id: 'interior', name: 'Interior Detail', duration: 120, price: 150 },
  { id: 'exterior', name: 'Exterior Wash', duration: 45, price: 35 },
  { id: 'full', name: 'Inside and Out Detail', duration: 180, price: 200 },
  { id: 'ceramic', name: 'Ceramic Coating', duration: 480, price: 800 },
]

function OnboardingSetupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get('plan') === 'pro' ? 'pro' : 'starter'
  const steps = plan === 'pro' ? PRO_STEPS : STARTER_STEPS

  const [stepIndex, setStepIndex] = useState(0)
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCrmAccess, setHasCrmAccess] = useState(false)
  const [postPaymentPolling, setPostPaymentPolling] = useState(false)
  const initialStepAppliedRef = useRef(false)
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#00b8f5')
  const [brandAccentColor, setBrandAccentColor] = useState('#00b8f5')
  const [saving, setSaving] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  const stepId = steps[stepIndex]
  const progress = ((stepIndex + 1) / steps.length) * 100

  useEffect(() => {
    let cancelled = false
    fetch('/api/onboarding/me')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setSlug(d.slug ?? null)
        setHasCrmAccess(Boolean(d.hasCrmAccess))
        if (d.onboardingComplete) {
          router.replace('/crm/dashboard')
          return
        }
        if (d.hasCrmAccess && searchParams.get('plan')) {
          router.replace('/crm/dashboard')
          return
        }
        if (searchParams.get('plan') && !d.hasCrmAccess) {
          setPostPaymentPolling(true)
        }
        // Only apply server step ONCE on initial load. Never overwrite after user has progressed.
        if (initialStepAppliedRef.current) return
        initialStepAppliedRef.current = true
        const savedStep = typeof d.onboardingStep === 'string' ? d.onboardingStep.trim() : null
        if (savedStep) {
          const idx = (steps as readonly string[]).indexOf(savedStep)
          if (idx >= 0) setStepIndex(idx)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // Only run once on mount to restore step. Never re-fetch and overwrite user's progress.
  }, [])

  // After Stripe success: poll until webhook has updated org and we have CRM access, then redirect to dashboard
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
        // ignore
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

  if (loading) {
    return (
      <div className="auth-hero-bg min-h-screen flex items-center justify-center">
        <p className="text-[#64748b] relative z-[1]">Loading...</p>
      </div>
    )
  }

  if (postPaymentPolling) {
    return (
      <div className="auth-hero-bg min-h-screen flex items-center justify-center px-4">
        <div className="relative w-full flex flex-col items-center justify-center">
          <div className="auth-hero-glow" aria-hidden />
          <div className="h-10 w-10 rounded-full border-2 border-[#00b8f5] border-t-transparent animate-spin mb-4 relative z-[1]" />
          <p className="text-[#eef0f2] font-medium relative z-[1]">Payment received.</p>
          <p className="text-sm text-[#64748b] mt-1 relative z-[1]">Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-hero-bg min-h-screen text-[#eef0f2]">
      <header className="border-b border-[rgba(255,255,255,0.07)] bg-[#0c1018] px-4 py-4 relative z-[1]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/detailopslogo.png" alt="DetailOps" width={120} height={32} className="h-9 w-auto opacity-90" />
          </Link>
          <div className="flex-1 mx-6 h-2 rounded-full bg-[#101620] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#00b8f5] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-[#64748b]">
            Step {stepIndex + 1} of {steps.length}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-10 relative z-[1]">
        {stepId === 'Services' && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text)]">Services setup</h1>
            <p className="text-sm text-[var(--text-2)]">
              Your account includes default services. You can add or edit more in the CRM after you finish.
            </p>
            <ul className="space-y-2">
              {SERVICE_OPTIONS.map((s) => (
                <li key={s.id} className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
                  <Check className="h-4 w-4 text-[var(--blue)] shrink-0" />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-[var(--text-2)] text-sm ml-auto">{s.duration} min · ${s.price}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goBack} disabled={stepIndex === 0}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {stepId === 'Branding' && plan === 'starter' && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text)]">Branding</h1>
            <div className="p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] border-dashed flex flex-col items-center justify-center text-center gap-4">
              <Lock className="h-10 w-10 text-[var(--text-3)]" />
              <p className="text-[var(--text-2)]">
                Logo, colours, and layout customisation are available on the Pro plan.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/onboarding?plan=pro">Upgrade to Pro</Link>
              </Button>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goBack}>Back</Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {stepId === 'Branding' && plan === 'pro' && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text)]">Booking page colours</h1>
            <p className="text-sm text-[var(--text-2)]">
              Primary and accent colours for your public booking page. Saved to your organization; you can change them anytime in Settings → Branding.
            </p>
            <div className="space-y-4">
              <div>
                <Label>Primary color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded border border-[var(--border)] cursor-pointer"
                  />
                  <Input
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>Accent color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={brandAccentColor}
                    onChange={(e) => setBrandAccentColor(e.target.value)}
                    className="h-10 w-14 rounded border border-[var(--border)] cursor-pointer"
                  />
                  <Input
                    value={brandAccentColor}
                    onChange={(e) => setBrandAccentColor(e.target.value)}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goBack}>Back</Button>
              <Button
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
                {saving ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {stepId === 'Integrations' && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text)]">Integrations</h1>
            <p className="text-sm text-[var(--text-2)]">
              Connect Stripe and Google Calendar in the CRM after you finish. Optional for now.
            </p>
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
              <p className="text-sm text-[var(--text-2)]">
                Go to <strong className="text-[var(--text)]">Settings → Payments</strong> for Stripe and{' '}
                <strong className="text-[var(--text)]">Settings → Schedule</strong> for Google Calendar.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goBack}>Back</Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {stepId === 'Preview' && (
          <div className="space-y-6">
            <div className="pt-2">
              <h1 className="text-xl font-bold text-[var(--text)]">Preview your booking page</h1>
              <p className="text-sm text-[var(--text-2)] mt-1">
                This is how clients will see and book with you. Share the link when you're ready.
              </p>
            </div>
            {slug ? (
              <>
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden bg-[var(--surface-1)]">
                  <iframe
                    title="Booking page preview"
                    src={`/book/${encodeURIComponent(slug)}`}
                    className="w-full h-[400px] border-0"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewExpanded(true)}
                  className="gap-2"
                >
                  <Expand className="h-4 w-4" />
                  Expand preview
                </Button>
                {previewExpanded && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    onClick={() => setPreviewExpanded(false)}
                  >
                    <div
                      className="relative w-full max-w-4xl h-[85vh] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl flex flex-col overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0">
                        <span className="text-sm font-medium text-[var(--text)]">Booking page preview</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewExpanded(false)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
              <p className="text-[var(--text-2)]">No booking URL set. You can set it in Settings → Branding.</p>
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goBack}>Back</Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {stepId === 'Done' && (
          <div className="space-y-6 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green)]/20 text-[var(--green)]">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text)]">You're all set</h1>
            <p className="text-[var(--text-2)]">
              Your booking page is live. Head to the dashboard to manage jobs, customers, and more.
            </p>
            <Button onClick={handleDone} disabled={saving} className="mt-4">
              {saving ? 'Saving...' : 'Go to Dashboard'}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function OnboardingSetupPage() {
  return (
    <Suspense fallback={
      <div className="auth-hero-bg min-h-screen flex items-center justify-center">
        <p className="text-[#64748b] relative z-[1]">Loading...</p>
      </div>
    }>
      <OnboardingSetupContent />
    </Suspense>
  )
}
