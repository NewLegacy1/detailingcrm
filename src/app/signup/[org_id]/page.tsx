'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { MosaicPanel } from '@/components/MosaicPanel'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
})

// Details step removed — user already submitted those on /signup
const STEPS = ['Team size', 'Features', 'Service area', 'Website', 'Branding', 'Preview'] as const

const TEAM_OPTIONS = [
  { value: 'just_me', label: 'Just me' },
  { value: '2_5',     label: '2–5' },
  { value: '6_10',    label: '6–10' },
  { value: '10_plus', label: '10+' },
] as const

const FEATURE_OPTIONS = [
  { id: 'marketing',  label: 'Marketing' },
  { id: 'leads',      label: 'Leads' },
  { id: 'payments',   label: 'Payments' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'invoices',   label: 'Invoices' },
  { id: 'customers',  label: 'Customers' },
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


const inputClass =
  'w-full py-3.5 px-5 rounded-full border border-[rgba(255,255,255,0.07)] bg-[#0c1018] text-[0.88rem] text-[#eef0f2] placeholder:text-[#64748b] outline-none transition-[border-color,box-shadow,background] focus:border-[rgba(0,184,245,0.4)] focus:bg-[#0d1319] focus:shadow-[0_0_0_3px_rgba(0,184,245,0.08)]'
const submitBtnClass =
  'w-full py-[15px] rounded-full border-0 text-white text-[0.95rem] font-medium tracking-wide cursor-pointer transition-[opacity,transform,box-shadow] hover:opacity-90 hover:shadow-[0_6px_28px_rgba(0,184,245,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

export default function SignupOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = typeof params?.org_id === 'string' ? params.org_id : null

  const [loading, setLoading]       = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [stepIndex, setStepIndex]   = useState(0)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const [teamSize, setTeamSize]     = useState<string>('')
  const [features, setFeatures]     = useState<Record<string, boolean>>({})

  const [serviceAreaLabel, setServiceAreaLabel] = useState('')
  const [mapLat, setMapLat] = useState<number | null>(null)
  const [mapLng, setMapLng] = useState<number | null>(null)
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark')
  const [mapsReady, setMapsReady]   = useState(false)
  const serviceAreaInputRef         = useRef<HTMLInputElement>(null)
  const autocompleteRef             = useRef<google.maps.places.Autocomplete | null>(null)

  const [website, setWebsite]       = useState('')
  const [primaryColor, setPrimaryColor] = useState('#00b8f5')
  const [accentColor, setAccentColor]   = useState('#00b8f5')
  const [slug, setSlug]             = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  const stepId   = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  // Auth guard
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/signup/${orgId ?? ''}`)}`)
        return
      }
      setAuthChecked(true)
    }
    if (orgId) check()
    else setAuthChecked(true)
  }, [orgId, router])

  // Load org data (slug for preview, authz check)
  useEffect(() => {
    if (!authChecked || !orgId) return
    let cancelled = false
    fetch('/api/onboarding/me')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.orgId && data.orgId !== orgId) { router.replace('/crm/dashboard'); return }
        setSlug(data.slug ?? null)
        if (typeof data.primaryColor === 'string' && data.primaryColor.trim()) setPrimaryColor(data.primaryColor.trim())
        if (typeof data.accentColor === 'string' && data.accentColor.trim()) setAccentColor(data.accentColor.trim())
        const savedStep = typeof data.onboardingStep === 'string' ? data.onboardingStep.trim() : null
        if (savedStep) {
          const idx = (STEPS as readonly string[]).indexOf(savedStep)
          if (idx >= 0) setStepIndex(idx)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [authChecked, orgId, router])

  // Load Google Maps when on Service area step
  useEffect(() => {
    if (stepId !== 'Service area') return
    const setReady = () => setMapsReady(!!window.google)
    const existing = document.querySelector('script[data-signup-onboarding-maps]')
    if (existing) {
      if (window.google) setReady()
      else {
        const t = setInterval(() => { if (window.google) { setReady(); clearInterval(t) } }, 150)
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
    return () => { delete window.__signupOnboardingMapsReady }
  }, [stepId])

  // Attach Places autocomplete
  useEffect(() => {
    if (stepId !== 'Service area' || !mapsReady || !serviceAreaInputRef.current || !window.google?.maps?.places) return
    const input = serviceAreaInputRef.current
    const ac = new window.google.maps.places.Autocomplete(input, {
      types: ['(regions)'],
      fields: ['formatted_address', 'geometry'],
    })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const loc   = place.geometry?.location
      const address = place.formatted_address ?? ''
      if (input) input.value = address
      setServiceAreaLabel(address)
      if (loc) { setMapLat(loc.lat()); setMapLng(loc.lng()) }
    })
    autocompleteRef.current = ac
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        try { window.google.maps.event.clearInstanceListeners(autocompleteRef.current) } catch (_) {}
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
      } catch (_) {}
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
      } catch (_) {}
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
      } catch (_) {}
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
      } catch (_) {}
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
            accent_color:  accentColor?.trim()  || null,
          }),
        })
      } catch (_) {}
      setSaving(false)
    }

    await saveProgress(nextStep ?? 'Preview')
    setStepIndex((i) => i + 1)
  }, [stepIndex, stepId, teamSize, features, mapLat, mapLng, mapTheme, website, primaryColor, accentColor, saveProgress])

  const applyBranding = useCallback(async () => {
    setSaving(true)
    try {
      await fetch('/api/onboarding/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: primaryColor?.trim() || null,
          accent_color:  accentColor?.trim()  || null,
        }),
      })
      setPreviewKey((k) => k + 1)
    } catch (_) {}
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

  if (!orgId || !authChecked || loading) {
    return (
      <div className="auth-hero-bg min-h-screen flex items-center justify-center">
        <div className="text-[#64748b] relative z-[1]">Loading...</div>
      </div>
    )
  }

  return (
    <div className={`auth-hero-bg min-h-screen flex items-center justify-center px-4 py-8 ${plusJakarta.className}`}>
      <div className="relative w-full flex items-center justify-center">
        <div className="auth-hero-glow" aria-hidden />
        <div className="auth-card w-[1100px] max-w-[98vw] min-h-[520px] h-[620px] max-h-[90vh] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[45%_55%] shadow-2xl border border-[rgba(255,255,255,0.07)] relative bg-[#101620]">

        {/* Left panel */}
        <div className="hidden md:block relative bg-[#0c1018] overflow-hidden min-h-[280px]">
          <div className="absolute inset-0 pointer-events-none z-[5]" style={{ background: 'linear-gradient(to right, transparent 40%, #0c1018 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-[55%] pointer-events-none z-[5]" style={{ background: 'linear-gradient(to top, #0c1018 30%, transparent 100%)' }} />
          <MosaicPanel logoSrc="/detailopslogo.png" />
          <div className="absolute bottom-10 left-9 right-6 z-10">
            <h2 className="text-[1.75rem] font-bold text-[#e8edf5] leading-tight tracking-tight mb-2.5">
              Run Your Detail Business
              <br />
              with <span className="font-light text-[#00b8f5] not-italic">Precision</span>
            </h2>
            <p className="text-[0.82rem] text-[#5a6a80] leading-relaxed max-w-[300px]">
              Schedule jobs, manage crews, track payments, and grow your mobile detailing operation — all in one place.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col flex-1 min-h-0 bg-[#101620] md:border-l border-[rgba(255,255,255,0.07)]">
          <div className="flex-1 min-h-0 overflow-y-auto auth-panel-scroll flex flex-col justify-center items-center pt-16 pb-10 md:pt-20 md:pb-12 px-6 sm:px-12 md:px-16">

            {/* Progress bar */}
            <div className="w-full max-w-[360px] flex items-center gap-3 mb-6">
              <div className="flex-1 h-2 rounded-full bg-[#1a2332] overflow-hidden">
                <div className="h-full rounded-full bg-[#00b8f5] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[0.8rem] text-[#5a6a80] shrink-0">Step {stepIndex + 1} of {STEPS.length}</span>
            </div>

            {/* Team size */}
            {stepId === 'Team size' && (
              <div className="w-full max-w-[360px] space-y-4">
                <h1 className="text-[1.6rem] font-bold text-[#dce6f5] tracking-tight">Team size</h1>
                <p className="text-[0.82rem] text-[#4a5568]">How many people are on your team?</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEAM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTeamSize(opt.value)}
                      className={`py-3 px-4 rounded-full text-sm font-medium transition-colors ${
                        teamSize === opt.value
                          ? 'bg-[#00b8f5] text-white'
                          : 'border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] hover:bg-[#1a2332]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={goBack} disabled={stepIndex === 0} className="flex-1 py-3 rounded-full border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] text-sm font-medium disabled:opacity-40">Back</button>
                  <button type="button" onClick={goNext} disabled={saving} className={`flex-1 ${submitBtnClass}`} style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}>{saving ? 'Saving...' : 'Continue →'}</button>
                </div>
              </div>
            )}

            {/* Features */}
            {stepId === 'Features' && (
              <div className="w-full max-w-[360px] space-y-4">
                <h1 className="text-[1.6rem] font-bold text-[#dce6f5] tracking-tight">Features you want</h1>
                <p className="text-[0.82rem] text-[#4a5568]">Select the areas you care about most.</p>
                <div className="space-y-2">
                  {FEATURE_OPTIONS.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(0,184,245,0.15)] bg-[#111827] cursor-pointer hover:bg-[#141e2e]">
                      <input type="checkbox" checked={features[opt.id] ?? false} onChange={(e) => setFeatures((f) => ({ ...f, [opt.id]: e.target.checked }))} className="rounded border-[var(--border)]" />
                      <span className="text-[#c8d5e8] text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={goBack} className="flex-1 py-3 rounded-full border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] text-sm font-medium">Back</button>
                  <button type="button" onClick={goNext} disabled={saving} className={`flex-1 ${submitBtnClass}`} style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}>{saving ? 'Saving...' : 'Continue →'}</button>
                </div>
              </div>
            )}

            {/* Service area */}
            {stepId === 'Service area' && (
              <div className="w-full max-w-[360px] space-y-4">
                <h1 className="text-[1.6rem] font-bold text-[#dce6f5] tracking-tight">Service area</h1>
                <p className="text-[0.82rem] text-[#4a5568]">Where do you serve? This sets the map center on your booking page.</p>
                <input ref={serviceAreaInputRef} type="text" placeholder="e.g. Hamilton, ON or Oregon" className={inputClass} autoComplete="off" defaultValue={serviceAreaLabel} />
                {mapLat != null && mapLng != null && <p className="text-[0.75rem] text-[#5a6a80]">Location set — click Continue to save.</p>}
                <div>
                  <p className="text-[0.8rem] text-[#7e8da8] mb-2">Map style on your booking page</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMapTheme('dark')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        mapTheme === 'dark'
                          ? 'bg-[#00b8f5] text-white'
                          : 'border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] hover:bg-[#1a2332]'
                      }`}
                    >
                      🌑 Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapTheme('light')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        mapTheme === 'light'
                          ? 'bg-[#00b8f5] text-white'
                          : 'border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] hover:bg-[#1a2332]'
                      }`}
                    >
                      ☀️ Light
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={goBack} className="flex-1 py-3 rounded-full border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] text-sm font-medium">Back</button>
                  <button type="button" onClick={goNext} disabled={saving} className={`flex-1 ${submitBtnClass}`} style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}>{saving ? 'Saving...' : 'Continue →'}</button>
                </div>
              </div>
            )}

            {/* Website */}
            {stepId === 'Website' && (
              <div className="w-full max-w-[360px] space-y-4">
                <h1 className="text-[1.6rem] font-bold text-[#dce6f5] tracking-tight">Website</h1>
                <p className="text-[0.82rem] text-[#4a5568]">Your business website (optional).</p>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className={inputClass} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={goBack} className="flex-1 py-3 rounded-full border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] text-sm font-medium">Back</button>
                  <button type="button" onClick={goNext} disabled={saving} className={`flex-1 ${submitBtnClass}`} style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}>{saving ? 'Saving...' : 'Continue →'}</button>
                </div>
              </div>
            )}

            {/* Branding */}
            {stepId === 'Branding' && (
              <div className="w-full max-w-[360px] space-y-4">
                <h1 className="text-[1.6rem] font-bold text-[#dce6f5] tracking-tight">Branding &amp; colours</h1>
                <p className="text-[0.82rem] text-[#4a5568]">Primary and accent colours for your booking page.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[0.8rem] text-[#7e8da8] mb-1">Primary colour</label>
                    <div className="flex gap-2">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-14 rounded border border-[rgba(0,184,245,0.2)] cursor-pointer bg-[#111827]" />
                      <input type="text"  value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.8rem] text-[#7e8da8] mb-1">Accent colour</label>
                    <div className="flex gap-2">
                      <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-14 rounded border border-[rgba(0,184,245,0.2)] cursor-pointer bg-[#111827]" />
                      <input type="text"  value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={goBack} className="flex-1 py-3 rounded-full border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] text-sm font-medium">Back</button>
                  <button type="button" onClick={goNext} disabled={saving} className={`flex-1 ${submitBtnClass}`} style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}>{saving ? 'Saving...' : 'Continue →'}</button>
                </div>
              </div>
            )}

            {/* Preview */}
            {stepId === 'Preview' && (
              <div className="w-full flex flex-col gap-4 pt-2">

                {/* Header - extra padding so title isn't clipped */}
                <div className="min-h-0 overflow-visible">
                  <h1 className="text-[1.5rem] font-bold text-[#dce6f5] tracking-tight">Preview your booking page</h1>
                  <p className="text-[0.82rem] text-[#4a5568] mt-0.5">Tweak your colours and see them live before going to the dashboard.</p>
                </div>

                {/* Inline colour adjusters */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[0.72rem] text-[#7e8da8] mb-1.5">Primary colour</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-9 w-10 rounded-lg border border-[rgba(0,184,245,0.2)] cursor-pointer bg-[#111827] shrink-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 py-2 px-3 rounded-full border border-[rgba(0,184,245,0.15)] bg-[#111827] text-[0.82rem] text-[#c8d5e8] placeholder:text-[#3a4a60] outline-none focus:border-[rgba(0,184,245,0.4)]"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[0.72rem] text-[#7e8da8] mb-1.5">Accent colour</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-9 w-10 rounded-lg border border-[rgba(0,184,245,0.2)] cursor-pointer bg-[#111827] shrink-0"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 py-2 px-3 rounded-full border border-[rgba(0,184,245,0.15)] bg-[#111827] text-[0.82rem] text-[#c8d5e8] placeholder:text-[#3a4a60] outline-none focus:border-[rgba(0,184,245,0.4)]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={applyBranding}
                    disabled={saving}
                    className="shrink-0 self-end h-9 px-4 rounded-full border border-[rgba(0,184,245,0.35)] bg-[#111827] text-[#00b8f5] text-[0.8rem] font-medium hover:bg-[#1a2d4e] transition-colors disabled:opacity-50"
                  >
                    {saving ? '…' : 'Apply'}
                  </button>
                </div>

                {/* Iframe */}
                {slug ? (
                  <div className="rounded-xl border border-[rgba(0,184,245,0.2)] overflow-hidden bg-[#111827] w-full">
                    <iframe
                      key={previewKey}
                      title="Booking preview"
                      src={`/book/${encodeURIComponent(slug)}`}
                      className="w-full border-0"
                      style={{ height: 'clamp(340px, 42vh, 480px)' }}
                    />
                  </div>
                ) : (
                  <p className="text-[0.82rem] text-[#5a6a80]">Your booking URL is being set up.</p>
                )}

                {error && <div className="rounded-full bg-red-500/20 px-4 py-2.5 text-sm text-red-200">{error}</div>}

                <div className="flex gap-3">
                  <button type="button" onClick={goBack} className="flex-1 py-3 rounded-full border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] text-sm font-medium">Back</button>
                  <button type="button" onClick={handleDone} disabled={saving} className={`flex-1 ${submitBtnClass}`} style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}>{saving ? 'Saving...' : 'Go to Dashboard'}</button>
                </div>
              </div>
            )}

            <p className="mt-5 text-[0.82rem] text-[#3a4a60] text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-[#00b8f5] underline font-medium">Sign in</Link>
            </p>
          </div>

          <div className="shrink-0 flex justify-center gap-5 py-4 px-6 text-[0.72rem] text-[#2a3548]">
            <Link href="/crm/legal/privacy" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Privacy policy</Link>
            <Link href="/crm/legal/terms"   className="text-[#2a3548] no-underline hover:text-[#4a6080]">Terms &amp; conditions</Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
