import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { StripeConnectCard } from '@/components/settings/stripe-connect-card'
import { PaymentsForm } from '@/components/settings/payments-form'
import { BookingPaymentSettings } from '@/components/settings/booking-payment-settings'

export default async function SettingsPaymentsPage() {
  const auth = await getAuthAndPermissions()
  const supabase = await createClient()
  let orgId = auth?.orgId ?? null
  if (!orgId && auth) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  let org: { stripe_account_id: string | null; subscription_plan: string | null } | null = null
  if (orgId) {
    const res = await supabase
      .from('organizations')
      .select('stripe_account_id, subscription_plan')
      .eq('id', orgId)
      .single()
    org = res.data
  }
  const stripeConnected = !!org?.stripe_account_id
  const isPro = org?.subscription_plan === 'pro'

  return (
    <div className="space-y-8">
      <h1 className="page-title text-[var(--text)]">Payments & Invoicing</h1>
      <StripeConnectCard />
      <BookingPaymentSettings isPro={isPro} stripeConnected={stripeConnected} />
      <PaymentsForm stripeConnected={stripeConnected} />
    </div>
  )
}
