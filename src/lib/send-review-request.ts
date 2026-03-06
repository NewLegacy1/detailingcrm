import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'
import { buildReviewRequestHtml } from '@/lib/email-templates/review-request'

const BASE_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://detailops.vercel.app')

/**
 * Send the review follow-up email for a job once. Idempotent: if review_request_sent_at
 * is already set, or org has review disabled, or no client email, does nothing and returns.
 * Sets review_request_sent_at after sending (or when skipping so cron won't send later).
 * Call this as soon as a job is marked paid (Stripe webhook or manual payment).
 */
export async function sendReviewRequestForJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<{ sent: boolean; error?: string }> {
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, org_id, customer_id, review_request_sent_at')
    .eq('id', jobId)
    .single()

  if (jobErr || !job?.org_id) return { sent: false, error: jobErr?.message ?? 'Job not found' }
  if (job.review_request_sent_at) return { sent: false }

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, booking_slug, review_page_url, review_follow_up_enabled, review_request_subject, logo_url, primary_color, accent_color, theme, booking_header_text_color, booking_contact_phone, booking_contact_email')
    .eq('id', job.org_id)
    .single()

  if (orgErr || !org) return { sent: false, error: orgErr?.message ?? 'Org not found' }
  if (org.review_follow_up_enabled === false) return { sent: false }

  const reviewPageUrl =
    (org.review_page_url ?? '').trim() ||
    (org.booking_slug ? `${BASE_ORIGIN}/review/${org.booking_slug}` : '')
  if (!reviewPageUrl) return { sent: false }

  if (!job.customer_id) {
    await supabase.from('jobs').update({ review_request_sent_at: new Date().toISOString() }).eq('id', jobId)
    return { sent: false }
  }

  const { data: client } = await supabase.from('clients').select('id, name, email').eq('id', job.customer_id).single()
  const to = client?.email?.trim()
  if (!to || !to.includes('@')) {
    await supabase.from('jobs').update({ review_request_sent_at: new Date().toISOString() }).eq('id', jobId)
    return { sent: false }
  }

  const reviewUrl = reviewPageUrl.replace(/\{jobId\}/g, job.id)
  const subject = (org.review_request_subject ?? '').trim() || 'How was your experience?'
  const textFallback = `Hi ${client?.name || 'there'}, thanks for choosing ${org.name || 'us'}! Share your experience: ${reviewUrl}`
  const fromAddr = getFromAddressForSlug(org.booking_slug)
  const html = buildReviewRequestHtml({
    customerName: client?.name || 'there',
    reviewUrl,
    businessName: org.name || 'Your Detailer',
    businessPhone: org.booking_contact_phone ?? undefined,
    businessEmail: org.booking_contact_email ?? undefined,
    businessLogo: org.logo_url ?? null,
    primaryColor: org.primary_color ?? null,
    accentColor: org.accent_color ?? null,
    theme: org.theme ?? null,
    headerTextColor: org.booking_header_text_color ?? null,
  })

  const r = await sendEmail(to, subject, textFallback, html, fromAddr)
  const now = new Date().toISOString()
  await supabase.from('jobs').update({ review_request_sent_at: now }).eq('id', jobId)

  if (r.ok) return { sent: true }
  return { sent: false, error: r.error }
}
