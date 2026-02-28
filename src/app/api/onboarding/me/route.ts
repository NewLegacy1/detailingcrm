import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, onboarding_step, onboarding_complete, display_name, business_name, phone')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ slug: null, orgId: null, onboardingStep: null, onboardingComplete: false }, { status: 200 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('booking_slug, name, subscription_plan, subscription_status, primary_color, accent_color')
    .eq('id', profile.org_id)
    .single()

  const hasActivePlan =
    org?.subscription_plan === 'starter' || org?.subscription_plan === 'pro'
  const isActive = (org?.subscription_status ?? '').toLowerCase() === 'active'
  const hasCrmAccess = Boolean(hasActivePlan && isActive)

  return NextResponse.json({
    slug: org?.booking_slug ?? null,
    orgId: profile.org_id,
    orgName: org?.name ?? null,
    primaryColor: org?.primary_color ?? null,
    accentColor: org?.accent_color ?? null,
    profileDisplayName: profile?.display_name ?? null,
    profileBusinessName: profile?.business_name ?? null,
    profilePhone: profile?.phone ?? null,
    hasCrmAccess,
    onboardingStep: profile.onboarding_step ?? null,
    onboardingComplete: profile.onboarding_complete === true,
  })
}

export async function PATCH(request: NextRequest) {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.phone === 'string') updates.phone = body.phone
  if (typeof body.sms_consent === 'boolean') updates.sms_consent = body.sms_consent
  if (typeof body.display_name === 'string') updates.display_name = body.display_name.trim() || null
  if (typeof body.business_name === 'string') updates.business_name = body.business_name.trim() || null

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ ok: true })
  }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
