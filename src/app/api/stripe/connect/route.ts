import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { createConnectAccountAndLink } from '@/lib/stripe-connect'
import { getStripeRedirectBaseUrl } from '@/lib/stripe-redirect-url'

export async function POST() {
  const result = await requirePermission(PERMISSIONS.STRIPE_CONNECT)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()

  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) {
    return NextResponse.json(
      { error: 'No organization found. Ensure you have an organization (run Supabase migrations if needed) and your profile has an organization assigned.' },
      { status: 400 }
    )
  }

  const { baseUrl, error: urlError } = getStripeRedirectBaseUrl()
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400 })
  }

  const returnUrl = `${baseUrl}/crm/settings/payments?connected=1`
  const refreshUrl = `${baseUrl}/crm/settings/payments?refresh=1`

  const linkResult = await createConnectAccountAndLink(returnUrl, refreshUrl)
  if ('error' in linkResult) {
    return NextResponse.json({ error: linkResult.error }, { status: 400 })
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_account_id: linkResult.accountId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ url: linkResult.url })
}
