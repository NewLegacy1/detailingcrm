'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { PLAN_PAGE_PATH } from '@/components/settings/plan-page-actions'

declare global {
  interface Window {
    google?: typeof google
    __brandingMapsReady?: () => void
  }
}

const BUCKET = 'company-logos'

interface OrgBranding {
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  theme: string | null
  map_theme: string | null
  map_lat: number | null
  map_lng: number | null
  booking_slug: string | null
}

interface BrandingFormProps {
  org: OrgBranding | null
  profile?: { id: string; avatar_url: string | null } | null
  isStarter?: boolean
}

const MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAgxm86Lej6n8yvkCkpNQ55TYn8fTyembs'

export function BrandingForm({ org, profile, isStarter = false }: BrandingFormProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    logo_url: '',
    crm_accent_color: '',
    crm_bg_color: '',
    crm_text_color: '',
    primary_color: '',
    booking_text_color: '',
    secondary_color: '',
    accent_color: '',
    theme: 'dark',
    map_theme: 'dark',
    booking_slug: '',
    location: '',
    map_lat: null as number | null,
    map_lng: null as number | null,
  })
  const locationInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const initialLocationFilledRef = useRef(false)
  const [locationInputReady, setLocationInputReady] = useState(false)

  useEffect(() => {
    const setReady = () => setMapsReady(!!window.google)
    const existing = document.querySelector('script[data-branding-maps]')
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
    window.__brandingMapsReady = setReady
    const script = document.createElement('script')
    script.setAttribute('data-branding-maps', 'true')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&callback=__brandingMapsReady`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
    return () => {
      delete window.__brandingMapsReady
    }
  }, [])

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (data) {
          const mapLat = data.map_lat != null ? Number(data.map_lat) : null
          const mapLng = data.map_lng != null ? Number(data.map_lng) : null
          let locationDisplay = ''
          if (mapLat != null && mapLng != null) {
            try {
              const rev = await fetch(
                `/api/geocode/reverse?lat=${mapLat}&lng=${mapLng}`
              )
              const revData = await rev.json()
              locationDisplay = revData.formatted_address ?? ''
            } catch {
              locationDisplay = ''
            }
          }
          const logoUrl = data.logo_url ?? profile?.avatar_url ?? ''
          setForm((p) => ({
            ...p,
            logo_url: logoUrl,
            crm_accent_color: data.crm_accent_color ?? '',
            crm_bg_color: data.crm_bg_color ?? '',
            primary_color: data.primary_color ?? '',
            secondary_color: data.secondary_color ?? '',
            accent_color: data.accent_color ?? '',
            crm_text_color: data.crm_text_color ?? '',
            booking_text_color: data.booking_text_color ?? '',
            theme: data.theme ?? 'dark',
            map_theme: data.map_theme ?? 'dark',
            booking_slug: data.booking_slug ?? '',
            location: locationDisplay,
            map_lat: mapLat,
            map_lng: mapLng,
          }))
        }
      })
      .finally(() => setLoading(false))
  }, [profile?.avatar_url])

  // After form is visible, mark location input as ready on next tick so ref is set
  useEffect(() => {
    if (loading) {
      setLocationInputReady(false)
      return
    }
    const id = requestAnimationFrame(() => {
      if (locationInputRef.current) setLocationInputReady(true)
    })
    return () => cancelAnimationFrame(id)
  }, [loading])

  // Sync initial location into the uncontrolled input once (after load)
  useEffect(() => {
    if (loading || initialLocationFilledRef.current || !locationInputRef.current) return
    if (form.location) {
      locationInputRef.current.value = form.location
      initialLocationFilledRef.current = true
    }
  }, [loading, form.location])

  // Attach Google Autocomplete when Maps is ready and location input is in the DOM
  useEffect(() => {
    if (!mapsReady || loading || !locationInputReady || !locationInputRef.current || !window.google?.maps?.places) return
    const input = locationInputRef.current
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['(regions)'],
      fields: ['formatted_address', 'geometry'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const loc = place.geometry?.location
      const address = place.formatted_address ?? ''
      if (input) input.value = address
      if (loc) {
        setForm((p) => ({
          ...p,
          location: address,
          map_lat: loc.lat(),
          map_lng: loc.lng(),
        }))
      } else if (address) {
        setForm((p) => ({ ...p, location: address }))
      }
    })
    autocompleteRef.current = autocomplete
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
        } catch (_) {}
      }
      autocompleteRef.current = null
    }
  }, [mapsReady, loading, locationInputReady])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file (e.g. PNG, JPG).' })
      return
    }
    setUploading(true)
    setMessage(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'png'
    const path = `${profile.id}/logo-${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setMessage({ type: 'error', text: uploadError.message })
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
    setForm((p) => ({ ...p, logo_url: urlData.publicUrl }))
    setUploading(false)
    if (logoFileInputRef.current) logoFileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const slugRaw = form.booking_slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const slug = slugRaw || undefined
      const mapLat = form.map_lat != null && !Number.isNaN(Number(form.map_lat)) ? Number(form.map_lat) : null
      const mapLng = form.map_lng != null && !Number.isNaN(Number(form.map_lng)) ? Number(form.map_lng) : null
      const logoUrl = form.logo_url.trim() || null
      const payload: Record<string, unknown> = {
        logo_url: logoUrl,
        crm_accent_color: form.crm_accent_color.trim() || null,
        crm_bg_color: form.crm_bg_color.trim() || null,
        crm_text_color: form.crm_text_color.trim() || null,
        booking_text_color: form.booking_text_color.trim() || null,
        primary_color: form.primary_color.trim() || null,
        secondary_color: form.secondary_color.trim() || null,
        accent_color: form.accent_color.trim() || null,
        theme: form.theme,
        map_theme: form.map_theme,
        map_lat: mapLat,
        map_lng: mapLng,
      }
      if (slug !== undefined) payload.booking_slug = slug

      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
        setSaving(false)
        return
      }
      if (profile?.id && logoUrl) {
        const supabase = createClient()
        await supabase
          .from('profiles')
          .update({ avatar_url: logoUrl, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
      }
      setMessage({ type: 'success', text: 'Saved.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  const bookingBase =
    typeof window !== 'undefined'
      ? `${window.location.origin}/book`
      : ''

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading…</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && (
        <p className={message.type === 'success' ? 'text-sm text-green-500' : 'text-sm text-red-400'}>
          {message.text}
        </p>
      )}

      {isStarter && (
        <div className="card p-6 border-[var(--accent)]/30 bg-[var(--accent)]/5 space-y-4">
          <h2 className="section-title text-[var(--text)]">Pro feature</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Custom CRM and booking page colours and logo are available on the Pro plan. You can still set your booking slug and map location below.
          </p>
          <Link href={PLAN_PAGE_PATH}>
            <Button
              style={{
                background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                boxShadow: '0 4px 14px rgba(0,184,245,0.35)',
              }}
            >
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">CRM Colours</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Colours for the CRM when you’re logged in. Leave blank to use the default theme.
        </p>
        <p className="text-xs text-[var(--text-muted)]">Only accent and background can be customized. Surface (cards, panels) is set automatically to a slightly lighter shade of the background.</p>
        {isStarter ? (
          <p className="text-sm text-[var(--text-muted)]">CRM colours are a Pro feature. Upgrade above to customize.</p>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="crm_accent_color">CRM Accent</Label>
            <Input
              id="crm_accent_color"
              value={form.crm_accent_color}
              onChange={(e) => setForm((p) => ({ ...p, crm_accent_color: e.target.value }))}
              placeholder="#3b82f6"
            />
          </div>
          <div>
            <Label htmlFor="crm_bg_color">CRM Background</Label>
            <Input
              id="crm_bg_color"
              value={form.crm_bg_color}
              onChange={(e) => setForm((p) => ({ ...p, crm_bg_color: e.target.value }))}
              placeholder="#07090f"
            />
          </div>
          <div>
            <Label htmlFor="crm_text_color">CRM Text Colour</Label>
            <Input
              id="crm_text_color"
              value={form.crm_text_color}
              onChange={(e) => setForm((p) => ({ ...p, crm_text_color: e.target.value }))}
              placeholder="#eef2ff (leave blank for default)"
            />
          </div>
        </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Booking page link</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Your public booking page URL is /book/[slug]. Slug and map location below are stored for your company. The name and logo shown on the booking page come from Settings → Profile.
        </p>
        <div className="space-y-2">
          <Label htmlFor="booking_slug">Slug</Label>
          <Input
            id="booking_slug"
            value={form.booking_slug}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                booking_slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
              }))
            }
            placeholder="e.g. showroom-autocare"
          />
          {form.booking_slug.trim() && (
            <p className="text-sm text-[var(--text-muted)]">
              Link: {bookingBase}/{form.booking_slug.trim().toLowerCase().replace(/\s+/g, '-')}
            </p>
          )}
        </div>
      </div>

      <div className="card p-6 space-y-4 branding-map-location">
        <h2 className="section-title text-[var(--text)]">Booking map location</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Type your city or region and select it from the dropdown. This sets the starting point of the map on your public booking page (e.g. /book/{form.booking_slug.trim() || 'your-slug'}). Click Save to store.
        </p>
        <div className="space-y-1 relative">
          <Label htmlFor="location">City / region</Label>
          <Input
            ref={locationInputRef}
            id="location"
            type="text"
            placeholder="e.g. Hamilton, ON or Oregon"
            autoComplete="off"
            defaultValue=""
          />
          {form.map_lat != null && form.map_lng != null ? (
            <p className="text-xs text-[var(--text-muted)]">
              Map center set ({form.map_lat.toFixed(4)}, {form.map_lng.toFixed(4)}). Click Save to keep.
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Select a suggestion from the dropdown to set lat/lng; then click Save.
            </p>
          )}
        </div>
        <div>
          <Label>Map style</Label>
          <p className="text-xs text-[var(--text-muted)] mb-2">Choose the colour scheme for the map on your booking page.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, map_theme: 'dark' }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                form.map_theme !== 'light'
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
              }`}
            >
              <span>🌑</span> Dark
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, map_theme: 'light' }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                form.map_theme === 'light'
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
              }`}
            >
              <span>☀️</span> Light
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Booking portal branding</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Logo and colours for your public booking page. Use the button below to copy CRM colours here.
        </p>
        {isStarter ? (
          <p className="text-sm text-[var(--text-muted)]">Booking logo and colours are Pro features. Upgrade above to customize.</p>
        ) : (
        <>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((p) => ({
                ...p,
                primary_color: p.crm_bg_color || p.primary_color,
                accent_color: p.crm_accent_color || p.accent_color,
              }))
            }
          >
            Use same as CRM
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[var(--text)]">Logo</Label>
            <p className="text-xs text-[var(--text-muted)]">
              Used on your booking page. If you already set a logo in Profile, it appears here.
            </p>
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading || !profile?.id}
              className="block w-full text-sm text-[var(--text)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--bg)] file:text-[var(--text)] file:cursor-pointer hover:file:opacity-90"
            />
            {uploading && <p className="text-sm text-[var(--text-muted)]">Uploading…</p>}
            {form.logo_url ? (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-lg object-contain border border-[var(--border)] bg-[var(--bg)]"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((p) => ({ ...p, logo_url: '' }))}
                >
                  Remove logo
                </Button>
              </div>
            ) : null}
          </div>
          <div>
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
              value={form.theme}
              onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div>
            <Label htmlFor="primary_color">Primary color</Label>
            <Input
              id="primary_color"
              value={form.primary_color}
              onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
              placeholder="#0056E8"
            />
          </div>
          <div>
            <Label htmlFor="accent_color">Accent color</Label>
            <Input
              id="accent_color"
              value={form.accent_color}
              onChange={(e) => setForm((p) => ({ ...p, accent_color: e.target.value }))}
              placeholder="#0056E8"
            />
          </div>
          <div>
            <Label htmlFor="booking_text_color">Booking Text Colour</Label>
            <Input
              id="booking_text_color"
              value={form.booking_text_color}
              onChange={(e) => setForm((p) => ({ ...p, booking_text_color: e.target.value }))}
              placeholder="#eef2ff (leave blank for auto)"
            />
          </div>
        </div>
        </>
        )}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
