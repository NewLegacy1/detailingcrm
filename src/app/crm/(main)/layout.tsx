import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { createAuthClient } from '@/lib/supabase/server'
import { MainLayoutClient } from '@/components/main-layout-client'
import { lightenHex, surfaceScaleFromBg } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  const metadata: Metadata = { title: 'DetailOps' }
  const h = await headers()
  const host = h.get('host') ?? ''
  const proto = process.env.VERCEL ? 'https' : 'http'
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${proto}://${host}` : '')
  metadata.icons = { icon: '/api/icon?v=5' }
  if (!user) return metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, avatar_url')
    .eq('id', user.id)
    .single()
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', profile.org_id)
      .single()
    const logo = (org?.logo_url ?? profile?.avatar_url)?.trim()
    if (logo && origin) {
      const logoUrl = logo.startsWith('http') ? logo : `${origin}${logo.startsWith('/') ? logo : `/${logo}`}`
      metadata.icons = {
        icon: `${origin}/api/favicon?url=${encodeURIComponent(logoUrl)}`,
      }
    }
  }
  return metadata
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  unstable_noStore()
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/crm/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, business_name, avatar_url, org_id, location_id, product_tour_completed, onboarding_complete, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  const hasCrmAccess = await (async () => {
    if (!profile?.org_id) return false
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan, subscription_status')
      .eq('id', profile.org_id)
      .single()
    const hasPlan = org?.subscription_plan === 'starter' || org?.subscription_plan === 'pro'
    const isActive = (org?.subscription_status ?? '').toLowerCase() === 'active'
    return Boolean(hasPlan && isActive)
  })()

  if (!hasCrmAccess) {
    redirect('/onboarding')
  }

  const role = (profile?.role as UserRole) ?? 'pending'
  const effectiveRole: UserRole = role === 'pending' ? 'owner' : role
  const showProductTour =
    effectiveRole === 'owner' && profile?.product_tour_completed !== true

  let crmColors: {
    accent: string
    bg: string
    surface: string
    surface1: string
    surface2: string
    surface3: string
    surface4: string
    text?: string
  } | null = null
  let subscriptionPlan: 'starter' | 'pro' | null = null
  let orgLogoUrl: string | null = null
  let crmStylePreset: 'midnight' | 'carbon' | 'frost' = 'midnight'
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan, crm_accent_color, crm_bg_color, crm_surface_color, crm_text_color, logo_url, crm_style_preset, crm_use_custom_colours')
      .eq('id', profile.org_id)
      .single()
    subscriptionPlan = org?.subscription_plan === 'starter' || org?.subscription_plan === 'pro' ? org.subscription_plan : null
    if (org?.logo_url?.trim()) orgLogoUrl = org.logo_url.trim()
    if (org?.crm_style_preset === 'carbon' || org?.crm_style_preset === 'frost') {
      crmStylePreset = org.crm_style_preset
    }
    const useCustomColours = org?.crm_use_custom_colours === true
    const hasAnyCustomColour = !!(org?.crm_accent_color?.trim() || org?.crm_bg_color?.trim() || org?.crm_text_color?.trim())
    if (subscriptionPlan !== 'starter' && useCustomColours && hasAnyCustomColour) {
      const bg = (org.crm_bg_color ?? '').trim()
      const scale = bg ? surfaceScaleFromBg(bg) : null
      crmColors = {
        accent: (org.crm_accent_color ?? '').trim(),
        bg,
        surface: scale?.surface1 ?? (org.crm_surface_color ?? ''),
        surface1: scale?.surface1 ?? (org.crm_surface_color ?? ''),
        surface2: scale?.surface2 ?? '',
        surface3: scale?.surface3 ?? '',
        surface4: scale?.surface4 ?? '',
      }
      const textCol = (org.crm_text_color ?? '').trim()
      if (textCol) crmColors.text = textCol
    }
  }

  const locationId = profile?.location_id ?? null
  let jobCountQuery = supabase.from('jobs').select('*', { count: 'exact', head: true })
  let invoiceCountQuery = supabase.from('invoices').select('*', { count: 'exact', head: true })
  if (locationId) {
    jobCountQuery = jobCountQuery.eq('location_id', locationId)
    // Invoice count for location managers: only invoices tied to jobs at their location (approximate via job filter)
    const { data: jobIds } = await supabase.from('jobs').select('id').eq('location_id', locationId)
    const ids = (jobIds ?? []).map((j) => j.id)
    if (ids.length > 0) {
      invoiceCountQuery = supabase.from('invoices').select('*', { count: 'exact', head: true }).in('job_id', ids)
    } else {
      invoiceCountQuery = supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('job_id', '00000000-0000-0000-0000-000000000000')
    }
  }
  const [
    { count: jobCount },
    { count: invoiceCount },
  ] = await Promise.all([
    jobCountQuery,
    invoiceCountQuery,
  ])

  return (
    <MainLayoutClient
      role={effectiveRole}
      locationId={locationId}
      userEmail={user.email}
      displayName={profile?.display_name}
      businessName={profile?.business_name}
      logoUrl={orgLogoUrl ?? profile?.avatar_url}
      jobCount={jobCount ?? 0}
      invoiceCount={invoiceCount ?? 0}
      crmColors={crmColors}
      showProductTour={showProductTour}
      subscriptionPlan={subscriptionPlan}
      crmStylePreset={crmStylePreset}
    >
      {children}
    </MainLayoutClient>
  )
}
