import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { createLoginLink } from '@/lib/stripe-connect'

export async function POST() {
  const result = await requirePermission(PERMISSIONS.STRIPE_MANAGE)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()

  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId!)
    .single()

  if (!org?.stripe_account_id) {
    return NextResponse.json({ error: 'Stripe not connected' }, { status: 400 })
  }

  const linkResult = await createLoginLink(org.stripe_account_id)
  if ('error' in linkResult) {
    return NextResponse.json({ error: linkResult.error }, { status: 400 })
  }

  return NextResponse.json({ url: linkResult.url })
}
