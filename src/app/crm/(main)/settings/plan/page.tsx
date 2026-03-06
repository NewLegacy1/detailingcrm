import { createAuthClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { UpgradeToProButton, ManageSubscriptionButton } from '@/components/settings/plan-page-actions'
import { Check } from 'lucide-react'

export default async function SettingsPlanPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  let subscriptionPlan: 'starter' | 'pro' | null = null
  let stripeCustomerId: string | null = null
  let subscriptionStatus: string | null = null

  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan, subscription_status, stripe_customer_id')
      .eq('id', profile.org_id)
      .single()
    if (org?.subscription_plan === 'starter' || org?.subscription_plan === 'pro') {
      subscriptionPlan = org.subscription_plan
    }
    subscriptionStatus = org?.subscription_status ?? null
    stripeCustomerId = org?.stripe_customer_id ?? null
  }

  const isPro = subscriptionPlan === 'pro'
  const isStarter = subscriptionPlan === 'starter'
  const canManageBilling = !!stripeCustomerId

  return (
    <div className="space-y-8">
      <h1 className="page-title text-[var(--text)]">Plan & Billing</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Your current plan and upgrade options. Manage your subscription or payment method below.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-[var(--border)] bg-[var(--bg-card)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Current plan</h2>
              <span className="rounded-full bg-[var(--accent-dim)] px-3 py-1 text-sm font-medium text-[var(--accent)]">
                {subscriptionPlan === 'pro' ? 'Pro' : subscriptionPlan === 'starter' ? 'Starter' : '—'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscriptionStatus && (
              <p className="text-sm text-[var(--text-muted)] capitalize">Status: {subscriptionStatus}</p>
            )}
            {isStarter && (
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  60 jobs per month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  Core CRM & booking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  Invoices & schedule
                </li>
              </ul>
            )}
            {isPro && (
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  Unlimited jobs
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  Automations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  Team & crew
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  Custom CRM & booking branding
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  Deposits & card on file
                </li>
              </ul>
            )}
            {(isStarter || isPro) && (
              <div className="pt-4">
                <ManageSubscriptionButton />
                {!canManageBilling && (
                  <p className="text-xs text-[var(--text-muted)] mt-2">Complete a subscription to manage billing, update payment, or cancel.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--bg-card)]">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--text)]">Pro</h2>
            <p className="text-sm text-[var(--text-muted)]">Unlock everything</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                Unlimited jobs per month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                Automations (reviews, reminders, upsells)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                Team & crew management
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                Custom CRM & booking page colors
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                Customer deposits & card on file
              </li>
            </ul>
            {isStarter && (
              <div className="pt-2">
                <UpgradeToProButton />
              </div>
            )}
            {isPro && (
              <p className="text-sm text-[var(--text-muted)]">You’re on Pro. Use “Manage subscription” to update payment or cancel.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
