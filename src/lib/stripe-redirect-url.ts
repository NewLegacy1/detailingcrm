/**
 * Server-only. Base URL for Stripe redirects (return_url, success_url, etc.).
 * In live mode, Stripe requires HTTPS and rejects localhost.
 */
export function getStripeRedirectBaseUrl(): { baseUrl: string; error?: string } {
  let base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  base = base.replace(/\/$/, '') // no trailing slash

  const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (stripeKey.startsWith('sk_live_')) {
    if (base.startsWith('http://')) {
      base = 'https://' + base.slice(7)
    }
    if (!base.startsWith('https://')) {
      return {
        baseUrl: base,
        error: 'Stripe live mode requires HTTPS. Set NEXT_PUBLIC_APP_URL to your production URL (e.g. https://detailops.vercel.app).',
      }
    }
    if (base.includes('localhost') || base.includes('127.0.0.1')) {
      return {
        baseUrl: base,
        error:
          'Stripe live mode cannot use localhost. Use test keys (sk_test_*) for local development, or run this from your production URL (e.g. https://detailops.vercel.app).',
      }
    }
  }

  return { baseUrl: base }
}
