import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { createAuthClient } from '@/lib/supabase/server'
import { MainLayoutClient } from '@/components/main-layout-client'
import { lightenHex, surfaceScaleFromBg } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export const dynamic = 'force-dynamic'

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
    .select('role, display_name, business_name, avatar_url, org_id, product_tour_completed, onboarding_complete, onboarding_completed_at')
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
  } | null = null
  let subscriptionPlan: 'starter' | 'pro' | null = null
  let orgLogoUrl: string | null = null
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan, crm_accent_color, crm_bg_color, crm_surface_color, logo_url')
      .eq('id', profile.org_id)
      .single()
    subscriptionPlan = org?.subscription_plan === 'starter' || org?.subscription_plan === 'pro' ? org.subscription_plan : null
    if (org?.logo_url?.trim()) orgLogoUrl = org.logo_url.trim()
    if (org?.crm_accent_color || org?.crm_bg_color) {
      const bg = (org.crm_bg_color ?? '').trim()
      const scale = bg ? surfaceScaleFromBg(bg) : null
      crmColors = {
        accent: org.crm_accent_color ?? '',
        bg,
        surface: scale?.surface1 ?? (org.crm_surface_color ?? ''),
        surface1: scale?.surface1 ?? (org.crm_surface_color ?? ''),
        surface2: scale?.surface2 ?? '',
        surface3: scale?.surface3 ?? '',
        surface4: scale?.surface4 ?? '',
      }
    }
  }

  const [
    { count: jobCount },
    { count: invoiceCount },
  ] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
  ])

  return (
    <MainLayoutClient
      role={effectiveRole}
      userEmail={user.email}
      displayName={profile?.display_name}
      businessName={profile?.business_name}
      logoUrl={orgLogoUrl ?? profile?.avatar_url}
      jobCount={jobCount ?? 0}
      invoiceCount={invoiceCount ?? 0}
      crmColors={crmColors}
      showProductTour={showProductTour}
      subscriptionPlan={subscriptionPlan}
    >
      {children}
    </MainLayoutClient>
  )
}
