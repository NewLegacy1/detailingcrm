import { createAuthClient } from '@/lib/supabase/server'
import { BrandingForm } from './branding-form'

export default async function SettingsBrandingPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('id, org_id, avatar_url').eq('id', user.id).single()
    : { data: null }

  let org: { logo_url: string | null; primary_color: string | null; secondary_color: string | null; accent_color: string | null; theme: string | null; map_theme: string | null; map_lat: number | null; map_lng: number | null; booking_slug: string | null } | null = null
  let isStarter = false
  if (profile?.org_id) {
    const res = await supabase
      .from('organizations')
      .select('logo_url, primary_color, secondary_color, accent_color, theme, map_theme, map_lat, map_lng, booking_slug, subscription_plan')
      .eq('id', profile.org_id)
      .single()
    org = res.data ? { logo_url: res.data.logo_url, primary_color: res.data.primary_color, secondary_color: res.data.secondary_color, accent_color: res.data.accent_color, theme: res.data.theme, map_theme: res.data.map_theme, map_lat: res.data.map_lat, map_lng: res.data.map_lng, booking_slug: res.data.booking_slug } : null
    isStarter = res.data?.subscription_plan === 'starter'
  }

  const profileForLogo = profile ? { id: profile.id, avatar_url: profile.avatar_url } : null

  return (
    <div className="space-y-8">
      <h1 className="page-title text-[var(--text)]">Branding and Booking Portal</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Customize your logo, colors, and booking page map location. The map center is where your client-facing booking page starts before a customer enters their address.
      </p>
      <BrandingForm org={org} profile={profileForLogo} isStarter={isStarter} />
    </div>
  )
}
