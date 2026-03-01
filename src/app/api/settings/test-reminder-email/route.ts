import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'

/** Send one test job reminder email for troubleshooting. */
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
    .select('id, booking_slug, job_reminder_sms_message, job_reminder_subject')
    .eq('id', orgId)
    .single()

  if (orgErr || !org?.id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const scheduledAt = 'Tomorrow at 2:00 PM'
  const template = (org.job_reminder_sms_message ?? 'Hi {{name}}, reminder: your appointment is scheduled for {{scheduledAt}}. Reply if you need to reschedule.').trim()
  let bodyText = template
  for (const [key, value] of Object.entries({
    name: 'Valued Customer',
    email: to,
    phone: '',
    company: '',
    address: '',
    notes: '',
    scheduledAt,
  })) {
    bodyText = bodyText.split(`{{${key}}}`).join(value ?? '')
  }

  const subjectLine = org.job_reminder_subject?.trim() || 'Appointment reminder'
  const fromAddr = getFromAddressForSlug(org.booking_slug)
  const sendResult = await sendEmail(to, `Test: ${subjectLine}`, bodyText, undefined, fromAddr)

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Test reminder email sent to ${to}.` })
}
