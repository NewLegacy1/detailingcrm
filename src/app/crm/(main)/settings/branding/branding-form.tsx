'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { PLAN_PAGE_PATH } from '@/components/settings/plan-page-actions'
import { CrmStylePresetSettings } from '@/components/settings/crm-style-preset-settings'
import { CrmCustomColourSettings } from '@/components/settings/crm-custom-colour-settings'
import { Paintbrush } from 'lucide-react'

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
  booking_service_area_label?: string | null
  service_radius_km?: number | null
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
  const [useCustomColoursActive, setUseCustomColoursActive] = useState(false)
  const [form, setForm] = useState({
    logo_url: '',
    crm_accent_color: '',
    crm_bg_color: '',
    crm_text_color: '',
    primary_color: '',
    booking_text_color: '',
    booking_header_text_color: '',
    secondary_color: '',
    accent_color: '',
    theme: 'dark',
    map_theme: 'dark',
    booking_slug: '',
    website: '',
    location: '',
    booking_service_area_label: '',
    map_lat: null as number | null,
    map_lng: null as number | null,
    service_radius_km: null as number | null,
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
            booking_header_text_color: data.booking_header_text_color ?? '',
            theme: (data.theme ?? data.map_theme ?? 'dark') as string,
            map_theme: (data.theme ?? data.map_theme ?? 'dark') as string,
            booking_slug: data.booking_slug ?? '',
            website: data.website ?? '',
            location: locationDisplay,
            booking_service_area_label: data.booking_service_area_label ?? '',
            map_lat: mapLat,
            map_lng: mapLng,
            service_radius_km: data.service_radius_km != null ? Number(data.service_radius_km) : null,
          }))
          setUseCustomColoursActive(data?.crm_use_custom_colours === true)
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
        booking_header_text_color: form.booking_header_text_color.trim() || null,
        primary_color: form.primary_color.trim() || null,
        secondary_color: form.secondary_color.trim() || null,
        accent_color: form.accent_color.trim() || null,
        theme: form.theme,
        map_theme: form.map_theme,
        map_lat: mapLat,
        map_lng: mapLng,
        booking_service_area_label: form.booking_service_area_label.trim() || null,
        website: form.website.trim() || null,
        service_radius_km: form.service_radius_km != null && form.service_radius_km > 0 ? Number(form.service_radius_km) : null,
      }
      if (slug !== undefined) payload.booking_slug = slug
      const hasCustomColoursInForm = !!(form.crm_accent_color.trim() || form.crm_bg_color.trim() || form.crm_text_color.trim())
      if (hasCustomColoursInForm) payload.crm_use_custom_colours = true

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
      setMessage({ type: 'success', text: hasCustomColoursInForm ? 'Saved. Refreshing…' : 'Saved.' })
      if (hasCustomColoursInForm) {
        window.location.reload()
        return
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  // Use canonical app URL when set (e.g. https://detailops.ca) so the booking link shows your domain, not the Vercel URL
  const canonicalOrigin =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL.trim()
      ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '')
      : null
  const bookingBase =
    typeof window !== 'undefined'
      ? canonicalOrigin
        ? `${canonicalOrigin}/book`
        : `${window.location.origin}/book`
      : ''

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading…</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && (
        <p className={message.type === 'success' ? 'text-sm text-green-500' : 'text-sm text-red-400'}>
          {message.text}
        </p>
      )}

      <CrmStylePresetSettings />

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
        <div className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-[var(--text-2)]" />
          <h2 className="section-title text-[var(--text)]">CRM Colours (Pro)</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Pro only. Leave blank to use your chosen preset. When set, custom colours override the style preset above.
        </p>
        <p className="text-xs text-[var(--text-muted)]">Click a colour swatch to open the colour picker. Surface (cards, panels) is derived from your background. Clear a colour to use the preset again.</p>
        {isStarter ? (
          <p className="text-sm text-[var(--text-muted)]">CRM colours are a Pro feature. Upgrade above to customize.</p>
        ) : (
          <CrmCustomColourSettings
            accent={form.crm_accent_color}
            bg={form.crm_bg_color}
            textColor={form.crm_text_color}
            useCustomColoursActive={useCustomColoursActive}
            onChange={(updates) => setForm((p) => ({ ...p, ...updates }))}
          />
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
        <div className="space-y-2">
          <Label htmlFor="booking_service_area_label">City or area (header)</Label>
          <Input
            id="booking_service_area_label"
            value={form.booking_service_area_label}
            onChange={(e) => setForm((p) => ({ ...p, booking_service_area_label: e.target.value }))}
            placeholder="e.g. Hamilton"
          />
          <p className="text-xs text-[var(--text-muted)]">
            Shown in the booking page header as “Top rated in [city]”. Leave blank to hide.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Company website</Label>
          <Input
            id="website"
            type="url"
            value={form.website}
            onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
            placeholder="https://yourbusiness.com"
          />
          <p className="text-xs text-[var(--text-muted)]">
            Used for the &quot;Back to [your business]&quot; link in the booking page menu. Leave blank to link to the app home.
          </p>
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
        <div className="space-y-1">
          <Label htmlFor="service_radius_km">Service radius (km)</Label>
          <Input
            id="service_radius_km"
            type="number"
            min={0}
            step={1}
            placeholder="e.g. 25"
            value={form.service_radius_km ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, service_radius_km: e.target.value === '' ? null : Number(e.target.value) || 0 }))}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Optional. If set, customers can only book when their address is within this distance from your map center. Leave blank for no limit.
          </p>
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
            <Label htmlFor="booking_portal_theme">Booking portal theme</Label>
            <p className="text-xs text-[var(--text-muted)] mb-2">Page and map use the same light or dark theme.</p>
            <select
              id="booking_portal_theme"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
              value={form.theme}
              onChange={(e) => {
                const v = e.target.value as 'dark' | 'light'
                setForm((p) => ({ ...p, theme: v, map_theme: v }))
              }}
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
            <Label htmlFor="booking_header_text_color">Header text (Book with [name])</Label>
            <p className="text-xs text-[var(--text-muted)] mb-1">Colour for the main heading only. Leave blank for auto.</p>
            <Input
              id="booking_header_text_color"
              value={form.booking_header_text_color}
              onChange={(e) => setForm((p) => ({ ...p, booking_header_text_color: e.target.value }))}
              placeholder="#eed202 or #eef2ff"
            />
          </div>
          <div>
            <Label htmlFor="booking_text_color">Body text (intro, labels, footer)</Label>
            <p className="text-xs text-[var(--text-muted)] mb-1">Colour for all other text on the booking page. On dark backgrounds use light colours; on light backgrounds use dark. Leave blank for auto.</p>
            <Input
              id="booking_text_color"
              value={form.booking_text_color}
              onChange={(e) => setForm((p) => ({ ...p, booking_text_color: e.target.value }))}
              placeholder="#eef2ff or #0f172a"
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
