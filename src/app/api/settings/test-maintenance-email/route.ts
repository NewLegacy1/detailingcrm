import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'

/** Send one test maintenance email with a real booking link (ref=maintenance&job=id) so you can verify the discount applies. */
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
    .select('id, booking_slug, maintenance_upsell_subject, maintenance_upsell_message, maintenance_detail_url, maintenance_discount_type, maintenance_discount_value')
    .eq('id', orgId)
    .single()

  if (orgErr || !org?.booking_slug) {
    return NextResponse.json({ error: 'Organization or booking slug not found' }, { status: 404 })
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'done')
    .limit(1)
    .maybeSingle()

  if (!job?.id) {
    return NextResponse.json(
      { error: 'Add at least one completed job to test the maintenance link (the link needs a real job id).' },
      { status: 400 }
    )
  }

  let baseOrigin = ''
  try {
    const url = org.maintenance_detail_url ?? ''
    if (url) baseOrigin = new URL(url).origin
  } catch (_) {}
  if (!baseOrigin && process.env.NEXT_PUBLIC_APP_URL) baseOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin
  if (!baseOrigin && typeof req.nextUrl?.origin === 'string') baseOrigin = req.nextUrl.origin
  if (!baseOrigin) baseOrigin = 'https://detailops.vercel.app'

  const maintenanceUrl = `${baseOrigin}/book/${org.booking_slug}?ref=maintenance&job=${job.id}`
  const discountType = org.maintenance_discount_type
  const discountValue = Number(org.maintenance_discount_value) || 0
  const maintenanceDiscount =
    discountType === 'percent' && discountValue > 0
      ? `${discountValue}% off`
      : discountType === 'fixed' && discountValue > 0
        ? `$${discountValue} off`
        : ''

  const template = (org.maintenance_upsell_message ?? 'Hi {{name}}, time for a refresh? Book your next detail: {{maintenanceUrl}}').trim()
  let bodyText = template
  for (const [key, value] of Object.entries({
    name: 'Valued Customer',
    email: to,
    phone: '',
    company: '',
    address: '',
    notes: '',
    maintenanceUrl,
    maintenanceDiscount,
  })) {
    bodyText = bodyText.split(`{{${key}}}`).join(value ?? '')
  }

  const subjectLine = org.maintenance_upsell_subject?.trim() || 'Time for your next detail?'
  const fromAddr = getFromAddressForSlug(org.booking_slug)
  const sendResult = await sendEmail(to, `Test: ${subjectLine}`, bodyText, undefined, fromAddr)

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Test email sent to ${to}. Click the link to verify the discount applies.` })
}
