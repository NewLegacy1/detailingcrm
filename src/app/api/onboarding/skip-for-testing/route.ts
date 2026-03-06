import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** Grant Pro subscription and mark onboarding complete so the CRM layout lets you in. Allowed in all environments for testing (e.g. on Vercel). */
export async function POST() {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // Grant Pro access on the org
  const { error: orgError } = await supabase
    .from('organizations')
    .update({ subscription_plan: 'pro', subscription_status: 'active', updated_at: now })
    .eq('id', profile.org_id)

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }

  // Mark onboarding complete on the profile so the CRM layout doesn't redirect to /onboarding/setup
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ onboarding_complete: true, onboarding_completed_at: now, updated_at: now })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, redirect: '/crm/dashboard' })
}
