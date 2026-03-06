/**
 * One-off: send a test review-request email to the given address.
 * Usage: npx tsx scripts/send-test-review-email.ts [email]
 * Default email: natexleon@gmail.com
 * Requires .env: RESEND_API_KEY, NOTIFICATION_EMAIL_DOMAIN or NOTIFICATION_FROM_EMAIL,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
// Load .env from project root
import { readFileSync } from 'fs'
import { resolve } from 'path'
try {
  const envPath = resolve(process.cwd(), '.env')
  const buf = readFileSync(envPath, 'utf8')
  for (const line of buf.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
} catch (_) { /* no .env or already set */ }

import { createClient } from '@supabase/supabase-js'
import { buildReviewRequestHtml } from '../src/lib/email-templates/review-request'
import { sendEmail, getFromAddressForSlug } from '../src/lib/notifications'

async function main() {
  const to = process.argv[2]?.trim() || 'natexleon@gmail.com'
  if (!to.includes('@')) {
    console.error('Usage: npx tsx scripts/send-test-review-email.ts [email]')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, booking_slug, review_page_url, logo_url, primary_color, accent_color, theme, booking_header_text_color, booking_contact_phone, booking_contact_email')
    .limit(1)
    .maybeSingle()

  if (orgErr || !org) {
    console.error('Failed to load org:', orgErr?.message || 'No organization found')
    process.exit(1)
  }

  const baseOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://detailops.vercel.app'
  const reviewPageUrl = (org.review_page_url ?? '').trim() || (org.booking_slug ? `${baseOrigin}/review/${org.booking_slug}` : '')
  const reviewUrl = reviewPageUrl ? reviewPageUrl.replace(/\{jobId\}/g, 'test-job-id') : `${baseOrigin}/review/test`

  const html = buildReviewRequestHtml({
    customerName: 'Valued Customer',
    reviewUrl,
    businessName: org.name || 'Your Detailer',
    businessPhone: org.booking_contact_phone || undefined,
    businessEmail: org.booking_contact_email || undefined,
    businessLogo: org.logo_url || null,
    primaryColor: org.primary_color || null,
    accentColor: org.accent_color || null,
    theme: org.theme || null,
    headerTextColor: org.booking_header_text_color || null,
  })
  const subject = 'Test: How was your experience?'
  const textFallback = `Hi Valued Customer, thanks for choosing ${org.name || 'us'}! Share your experience: ${reviewUrl}`
  const fromAddr = getFromAddressForSlug(org.booking_slug)

  const result = await sendEmail(to, subject, textFallback, html, fromAddr)
  if (result.ok) {
    console.log('Test review email sent to', to)
  } else {
    console.error('Send failed:', result.error)
    process.exit(1)
  }
}
main()
