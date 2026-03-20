'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { nativeAuthStyles as na } from '@/components/login/native-auth-styles'
import {
  NativeOnboardingShell,
  OnboardingLoginHero,
  OnboardingPrimaryButton,
  OnboardingSecondaryButton,
} from '@/components/onboarding/NativeOnboardingShell'
import { OnboardingFeatureCheckRow } from '@/components/onboarding/OnboardingFeatureCheckRow'

const STEPS = ['Team size', 'Features', 'Service area', 'Website', 'Branding', 'Preview'] as const

const TEAM_OPTIONS = [
  { value: 'just_me', label: 'Just me' },
  { value: '2_5', label: '2–5' },
  { value: '6_10', label: '6–10' },
  { value: '10_plus', label: '10+' },
] as const

const FEATURE_OPTIONS = [
  { id: 'marketing', label: 'Marketing' },
  { id: 'leads', label: 'Leads' },
  { id: 'payments', label: 'Payments' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'customers', label: 'Customers' },
] as const

const MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'

declare global {
  interface Window {
    google?: typeof google
    __signupOnboardingMapsReady?: () => void
  }
}

export default function SignupOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = typeof params?.org_id === 'string' ? params.org_id : null

  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [teamSize, setTeamSize] = useState<string>('')
  const [features, setFeatures] = useState<Record<string, boolean>>({})

  const [serviceAreaLabel, setServiceAreaLabel] = useState('')
  const [mapLat, setMapLat] = useState<number | null>(null)
  const [mapLng, setMapLng] = useState<number | null>(null)
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark')
  const [mapsReady, setMapsReady] = useState(false)
  const serviceAreaInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [areaFocus, setAreaFocus] = useState(false)

  const [website, setWebsite] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#00b8f5')
  const [accentColor, setAccentColor] = useState('#00b8f5')
  const [slug, setSlug] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  const [siteFocus, setSiteFocus] = useState(false)
  const [priFocus, setPriFocus] = useState(false)
  const [accFocus, setAccFocus] = useState(false)
  const [priPrevFocus, setPriPrevFocus] = useState(false)
  const [accPrevFocus, setAccPrevFocus] = useState(false)

  const stepId = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100
  const previewWide = stepId === 'Preview'

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/signup/${orgId ?? ''}`)}`)
        return
      }
      setAuthChecked(true)
    }
    if (orgId) check()
    else setAuthChecked(true)
  }, [orgId, router])

  useEffect(() => {
    if (!authChecked || !orgId) return
    let cancelled = false
    fetch('/api/onboarding/me')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.orgId && data.orgId !== orgId) {
          router.replace('/crm/dashboard')
          return
        }
        setSlug(data.slug ?? null)
        if (typeof data.primaryColor === 'string' && data.primaryColor.trim()) setPrimaryColor(data.primaryColor.trim())
        if (typeof data.accentColor === 'string' && data.accentColor.trim()) setAccentColor(data.accentColor.trim())
        if (typeof data.website === 'string') setWebsite(data.website.trim())
        const savedStep = typeof data.onboardingStep === 'string' ? data.onboardingStep.trim() : null
        if (savedStep) {
          const idx = (STEPS as readonly string[]).indexOf(savedStep)
          if (idx >= 0) setStepIndex(idx)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authChecked, orgId, router])

  useEffect(() => {
    if (stepId !== 'Service area') return
    const setReady = () => setMapsReady(!!window.google)
    const existing = document.querySelector('script[data-signup-onboarding-maps]')
    if (existing) {
      if (window.google) setReady()
      else {
        const t = setInterval(() => {
          if (window.google) {
            setReady()
            clearInterval(t)
          }
        }, 150)
        return () => clearInterval(t)
      }
      return
    }
    window.__signupOnboardingMapsReady = setReady
    const script = document.createElement('script')
    script.setAttribute('data-signup-onboarding-maps', 'true')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&callback=__signupOnboardingMapsReady`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
    return () => {
      delete window.__signupOnboardingMapsReady
    }
  }, [stepId])

  useEffect(() => {
    if (stepId !== 'Service area' || !mapsReady || !serviceAreaInputRef.current || !window.google?.maps?.places) return
    const input = serviceAreaInputRef.current
    const ac = new window.google.maps.places.Autocomplete(input, {
      types: ['(regions)'],
      fields: ['formatted_address', 'geometry'],
    })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const loc = place.geometry?.location
      const address = place.formatted_address ?? ''
      if (input) input.value = address
      setServiceAreaLabel(address)
      if (loc) {
        setMapLat(loc.lat())
        setMapLng(loc.lng())
      }
    })
    autocompleteRef.current = ac
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        } catch (_) {
          /* ignore */
        }
      }
      autocompleteRef.current = null
    }
  }, [stepId, mapsReady])

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
    if (stepIndex >= STEPS.length - 1) return
    setError(null)
    const nextStep = STEPS[stepIndex + 1]

    if (stepId === 'Team size') {
      setSaving(true)
      try {
        await fetch('/api/settings/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_size_range: teamSize || null }),
        })
      } catch (_) {
        /* ignore */
      }
      setSaving(false)
    }
    if (stepId === 'Features') {
      setSaving(true)
      try {
        await fetch('/api/settings/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onboarding_feature_preferences: features }),
        })
      } catch (_) {
        /* ignore */
      }
      setSaving(false)
    }
    if (stepId === 'Service area') {
      setSaving(true)
      try {
        await fetch('/api/settings/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(mapLat != null && mapLng != null ? { map_lat: mapLat, map_lng: mapLng } : {}),
            map_theme: mapTheme,
          }),
        })
      } catch (_) {
        /* ignore */
      }
      setSaving(false)
    }
    if (stepId === 'Website') {
      setSaving(true)
      try {
        await fetch('/api/settings/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website: website.trim() || null }),
        })
      } catch (_) {
        /* ignore */
      }
      setSaving(false)
    }
    if (stepId === 'Branding') {
      setSaving(true)
      try {
        await fetch('/api/onboarding/branding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            primary_color: primaryColor?.trim() || null,
            accent_color: accentColor?.trim() || null,
          }),
        })
      } catch (_) {
        /* ignore */
      }
      setSaving(false)
    }

    await saveProgress(nextStep ?? 'Preview')
    setStepIndex((i) => i + 1)
  }, [
    stepIndex,
    stepId,
    teamSize,
    features,
    mapLat,
    mapLng,
    mapTheme,
    website,
    primaryColor,
    accentColor,
    saveProgress,
  ])

  const applyBranding = useCallback(async () => {
    setSaving(true)
    try {
      await fetch('/api/onboarding/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: primaryColor?.trim() || null,
          accent_color: accentColor?.trim() || null,
        }),
      })
      setPreviewKey((k) => k + 1)
    } catch (_) {
      /* ignore */
    }
    setSaving(false)
  }, [primaryColor, accentColor])

  const handleDone = useCallback(async () => {
    setError(null)
    await saveProgress('complete', true)
    router.push('/crm/dashboard')
  }, [router, saveProgress])

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return
    setStepIndex((i) => i - 1)
  }, [stepIndex])

  const areaInputStyle = {
    ...na.fieldInputNoIcon,
    ...(areaFocus ? na.fieldInputFocus : {}),
  }

  const footer = (
    <>
      <p style={na.onboardingFooterNote}>
        <span style={na.signupText}>Already have an account? </span>
        <Link href="/login" style={na.signupLink}>
          Sign in
        </Link>
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

  if (!orgId || !authChecked || loading) {
    return (
      <NativeOnboardingShell showProgress={false} footer={footer}>
        <p style={{ color: '#5a6a80', fontSize: '0.95rem' }}>Loading…</p>
      </NativeOnboardingShell>
    )
  }

  const mapPill = (active: boolean) => ({
    padding: '12px 18px',
    borderRadius: 9999,
    border: active ? '1px solid rgba(0,184,245,0.45)' : '1px solid rgba(0,184,245,0.2)',
    background: active ? 'rgba(0,184,245,0.14)' : 'rgba(12,16,24,0.45)',
    color: '#dce6ec',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  })

  return (
    <NativeOnboardingShell
      progressPercent={progress}
      stepLabel={`Step ${stepIndex + 1} of ${STEPS.length}`}
      contentMaxWidth={previewWide ? 720 : 420}
      footer={footer}
    >
      {stepId === 'Team size' && (
        <>
          <OnboardingLoginHero line1="Team" line2Accent="size." subtext="How many people are on your team?" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {TEAM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTeamSize(opt.value)}
                style={{
                  ...na.onboardingGlassRow,
                  justifyContent: 'center',
                  border:
                    teamSize === opt.value
                      ? '1px solid rgba(0,184,245,0.4)'
                      : '1px solid rgba(0,184,245,0.12)',
                  background: teamSize === opt.value ? 'rgba(0,184,245,0.1)' : 'rgba(12,16,24,0.45)',
                  fontWeight: 600,
                  color: '#eef0f2',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack} disabled={stepIndex === 0}>
              Back
            </OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Features' && (
        <>
          <OnboardingLoginHero
            line1="What you"
            line2Accent="need."
            subtext="Select the areas you care about most."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURE_OPTIONS.map((opt) => (
              <OnboardingFeatureCheckRow
                key={opt.id}
                id={`feat-${opt.id}`}
                label={opt.label}
                checked={features[opt.id] ?? false}
                onChange={(c) => setFeatures((f) => ({ ...f, [opt.id]: c }))}
              />
            ))}
          </div>
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Service area' && (
        <>
          <OnboardingLoginHero
            line1="Service"
            line2Accent="area."
            subtext="Where do you serve? This sets the map center on your booking page."
          />
          <input
            ref={serviceAreaInputRef}
            className="do-native-auth-input"
            type="text"
            placeholder="e.g. Hamilton, ON or Oregon"
            autoComplete="off"
            defaultValue={serviceAreaLabel}
            onFocus={() => setAreaFocus(true)}
            onBlur={() => setAreaFocus(false)}
            style={areaInputStyle}
          />
          {mapLat != null && mapLng != null ? (
            <p style={{ fontSize: '0.8rem', color: '#5a6a80', marginTop: 8 }}>
              Location set — tap Continue to save.
            </p>
          ) : null}
          <p style={{ ...na.fieldLabel, marginTop: 20 }}>Map style on your booking page</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setMapTheme('dark')} style={mapPill(mapTheme === 'dark')}>
              Dark
            </button>
            <button type="button" onClick={() => setMapTheme('light')} style={mapPill(mapTheme === 'light')}>
              Light
            </button>
          </div>
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Website' && (
        <>
          <OnboardingLoginHero line1="Your" line2Accent="website." subtext="Your business website (optional)." />
          <input
            className="do-native-auth-input"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            onFocus={() => setSiteFocus(true)}
            onBlur={() => setSiteFocus(false)}
            style={{
              ...na.fieldInputNoIcon,
              ...(siteFocus ? na.fieldInputFocus : {}),
            }}
          />
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={goNext} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Branding' && (
        <>
          <OnboardingLoginHero
            line1="Brand"
            line2Accent="colours."
            subtext="Primary and accent colours for your booking page."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={na.fieldLabel}>Primary colour</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: '1px solid rgba(0,184,245,0.25)',
                    cursor: 'pointer',
                    background: '#0c1018',
                  }}
                />
                <input
                  className="do-native-auth-input"
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
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
              <label style={na.fieldLabel}>Accent colour</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    border: '1px solid rgba(0,184,245,0.25)',
                    cursor: 'pointer',
                    background: '#0c1018',
                  }}
                />
                <input
                  className="do-native-auth-input"
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
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
            <OnboardingPrimaryButton onClick={goNext} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}

      {stepId === 'Preview' && (
        <>
          <OnboardingLoginHero
            line1="Live"
            line2Accent="preview."
            subtext="Tweak colours and see them on your booking page before the dashboard."
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-end',
              marginBottom: 12,
            }}
          >
            <div style={{ flex: '1 1 140px', minWidth: 120 }}>
              <label style={{ ...na.fieldLabel, marginBottom: 8 }}>Primary</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(0,184,245,0.25)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <input
                  className="do-native-auth-input"
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  onFocus={() => setPriPrevFocus(true)}
                  onBlur={() => setPriPrevFocus(false)}
                  style={{
                    ...na.fieldInputNoIcon,
                    flex: 1,
                    minWidth: 0,
                    ...(priPrevFocus ? na.fieldInputFocus : {}),
                  }}
                />
              </div>
            </div>
            <div style={{ flex: '1 1 140px', minWidth: 120 }}>
              <label style={{ ...na.fieldLabel, marginBottom: 8 }}>Accent</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(0,184,245,0.25)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <input
                  className="do-native-auth-input"
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  onFocus={() => setAccPrevFocus(true)}
                  onBlur={() => setAccPrevFocus(false)}
                  style={{
                    ...na.fieldInputNoIcon,
                    flex: 1,
                    minWidth: 0,
                    ...(accPrevFocus ? na.fieldInputFocus : {}),
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={applyBranding}
              disabled={saving}
              style={{
                ...na.onboardingBtnSecondary,
                flex: '0 0 auto',
                paddingLeft: 20,
                paddingRight: 20,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '…' : 'Apply'}
            </button>
          </div>
          {slug ? (
            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(0,184,245,0.2)',
                overflow: 'hidden',
                background: 'rgba(12,16,24,0.35)',
              }}
            >
              <iframe
                key={previewKey}
                title="Booking preview"
                src={`/book/${encodeURIComponent(slug)}`}
                className="w-full border-0"
                style={{ height: 'clamp(300px, 38vh, 440px)' }}
              />
            </div>
          ) : (
            <p style={{ color: '#5a6a80', fontSize: '0.9rem' }}>Your booking URL is being set up.</p>
          )}
          {error ? <div style={{ ...na.authError, marginTop: 12 }}>{error}</div> : null}
          <div style={na.onboardingBtnRow}>
            <OnboardingSecondaryButton onClick={goBack}>Back</OnboardingSecondaryButton>
            <OnboardingPrimaryButton onClick={handleDone} disabled={saving}>
              {saving ? 'Saving…' : 'Go to Dashboard'}
              <span style={na.btnArrow}>→</span>
            </OnboardingPrimaryButton>
          </div>
        </>
      )}
    </NativeOnboardingShell>
  )
}
