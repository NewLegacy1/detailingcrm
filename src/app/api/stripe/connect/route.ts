import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { createConnectAccountAndLink, createAccountLinkForExisting } from '@/lib/stripe-connect'
import { getStripeRedirectBaseUrl } from '@/lib/stripe-redirect-url'

export async function POST() {
  const result = await requirePermission(PERMISSIONS.STRIPE_CONNECT)
  if ('error' in result) return result.error

  const { auth } = result
  const orgId = auth.orgId
  if (!orgId) {
    return NextResponse.json(
      { error: 'No organization found. Ensure you have an organization (run Supabase migrations if needed) and your profile has an organization assigned.' },
      { status: 400 }
    )
  }

  const supabase = await createAuthClient()

  const { baseUrl, error: urlError } = getStripeRedirectBaseUrl()
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400 })
  }

  const returnUrl = `${baseUrl}/crm/settings/payments?connected=1`
  const refreshUrl = `${baseUrl}/crm/settings/payments?refresh=1`

  // If this org already has a Stripe account, reuse it — only send a new link to complete/update onboarding. Never overwrite with a new account.
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', orgId)
    .single()

  if (existingOrg?.stripe_account_id) {
    const linkResult = await createAccountLinkForExisting(existingOrg.stripe_account_id, returnUrl, refreshUrl)
    if ('error' in linkResult) {
      return NextResponse.json({ error: linkResult.error }, { status: 400 })
    }
    return NextResponse.json({ url: linkResult.url })
  }

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
