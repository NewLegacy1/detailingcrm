import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { getAccountDetails } from '@/lib/stripe-connect'

export async function GET() {
  const auth = await getAuthAndPermissions()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasPermission(auth.permissions, PERMISSIONS.SETTINGS_VIEW) && !hasPermission(auth.permissions, PERMISSIONS.STRIPE_CONNECT)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = auth.orgId
  if (!orgId) return NextResponse.json({ connected: false, accountId: null, email: null })

  const supabase = await createAuthClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id, stripe_email')
    .eq('id', orgId!)
    .single()

  const accountId = org?.stripe_account_id ?? null
  let email = org?.stripe_email ?? null

  if (accountId && !email) {
    const details = await getAccountDetails(accountId)
    if (!('error' in details)) email = details.email
  }

  return NextResponse.json({
    connected: !!accountId,
    accountId,
    email,
  })
}
