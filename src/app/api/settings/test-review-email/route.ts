import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'

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
    .select('id, booking_slug, review_page_url, review_request_message, review_request_subject')
    .eq('id', orgId)
    .single()

  if (orgErr || !org?.review_page_url) {
    return NextResponse.json({ error: 'Organization or review page URL not found' }, { status: 404 })
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'done')
    .limit(1)
    .maybeSingle()

  const reviewUrl = job?.id
    ? (org.review_page_url ?? '').replace(/\{jobId\}/g, job.id)
    : (org.review_page_url ?? '').replace(/\{jobId\}/g, 'sample-job-id')

  const template = (org.review_request_message ?? "Hi {{name}}, thanks for choosing us! Please share your experience: {{reviewUrl}}").trim()
  let bodyText = template
  for (const [key, value] of Object.entries({
    name: 'Valued Customer',
    email: to,
    phone: '',
    company: '',
    address: '',
    notes: '',
    reviewUrl,
  })) {
    bodyText = bodyText.split(`{{${key}}}`).join(value ?? '')
  }

  const subjectLine = org.review_request_subject?.trim() || 'How was your experience?'
  const fromAddr = getFromAddressForSlug(org.booking_slug)
  const sendResult = await sendEmail(to, `Test: ${subjectLine}`, bodyText, undefined, fromAddr)

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Test review email sent to ${to}.` })
}
