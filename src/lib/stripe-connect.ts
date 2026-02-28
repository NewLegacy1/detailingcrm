/**
 * Server-only Stripe Connect (Express) helpers.
 * Do not import in client components.
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export interface ConnectResult {
  url: string
  accountId: string
}

export interface StripeAccountStatus {
  connected: boolean
  accountId: string | null
  email: string | null
}

/**
 * Create Express connected account and AccountLink for onboarding.
 * Caller must store accountId on org after this.
 */
export async function createConnectAccountAndLink(
  returnUrl: string,
  refreshUrl: string
): Promise<{ accountId: string; url: string } | { error: string }> {
  if (!stripeSecretKey) return { error: 'Stripe is not configured' }
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
    })

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return { accountId: account.id, url: accountLink.url }
  } catch (err) {
    console.error('Stripe Connect create error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create Connect account'
    return { error: message }
  }
}

/**
 * Create LoginLink for Express dashboard (Manage in Stripe).
 */
export async function createLoginLink(accountId: string): Promise<{ url: string } | { error: string }> {
  if (!stripeSecretKey) return { error: 'Stripe is not configured' }
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
    const loginLink = await stripe.accounts.createLoginLink(accountId)
    return { url: loginLink.url }
  } catch (err) {
    console.error('Stripe LoginLink error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create login link'
    return { error: message }
  }
}

/**
 * Retrieve account details for display (email, etc.).
 */
export async function getAccountDetails(accountId: string): Promise<{ email: string | null } | { error: string }> {
  if (!stripeSecretKey) return { error: 'Stripe is not configured' }
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
    const account = await stripe.accounts.retrieve(accountId)
    const email = account.email ?? (account as { email?: string }).email ?? null
    return { email: email ?? null }
  } catch (err) {
    console.error('Stripe account retrieve error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to retrieve account' }
  }
}
