import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'
import { buildReviewRequestHtml } from '@/lib/email-templates/review-request'

/** Send one test review follow-up email with a real review URL for troubleshooting. */
export async function POST(req: NextRequest) {
  const result = await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()
  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const to = typeof body.email === 'string' ? body.email.trim() : ''
  if (!to || !to.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, booking_slug, review_page_url, review_request_message, review_request_subject, logo_url, primary_color, accent_color, theme, booking_header_text_color, booking_contact_phone, booking_contact_email')
    .eq('id', orgId)
    .single()

  if (orgErr || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const bookingSlug = (org.booking_slug ?? '').trim()
  const storedReviewUrl = (org.review_page_url ?? '').trim()
  const baseOrigin =
    (typeof req.nextUrl?.origin === 'string' ? req.nextUrl.origin : null) ||
    (process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://detailops.vercel.app'
  const effectiveReviewPageUrl = storedReviewUrl || (bookingSlug ? `${baseOrigin}/review/${bookingSlug}` : '')

  if (!effectiveReviewPageUrl) {
    return NextResponse.json(
      { error: 'No review page URL. Set a booking slug in Settings → Branding so the review page URL can be generated (e.g. /review/your-slug).' },
      { status: 400 }
    )
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'done')
    .limit(1)
    .maybeSingle()

  const reviewUrl = job?.id
    ? effectiveReviewPageUrl.replace(/\{jobId\}/g, job.id)
    : effectiveReviewPageUrl.replace(/\{jobId\}/g, 'sample-job-id')

  const subjectLine = org.review_request_subject?.trim() || 'How was your experience?'
  const fromAddr = getFromAddressForSlug(org.booking_slug)
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
  const textFallback = `Hi Valued Customer, thanks for choosing ${org.name || 'us'}! Please share your experience: ${reviewUrl}`
  const sendResult = await sendEmail(to, `Test: ${subjectLine}`, textFallback, html, fromAddr)

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Test review email sent to ${to}.` })
}
