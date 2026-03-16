import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'
import { buildMaintenanceUpsellHtml } from '@/lib/email-templates/maintenance-upsell'

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
    .select('id, name, booking_slug, maintenance_upsell_subject, maintenance_upsell_message, maintenance_detail_url, maintenance_discount_type, maintenance_discount_value, logo_url, primary_color, accent_color, theme, booking_header_text_color, booking_contact_phone, booking_contact_email')
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
  const discountText =
    discountType === 'percent' && discountValue > 0
      ? `${discountValue}% off`
      : discountType === 'fixed' && discountValue > 0
        ? `$${discountValue} off`
        : ''

  const subjectLine = org.maintenance_upsell_subject?.trim() || 'Time for your next detail?'
  const fromAddr = getFromAddressForSlug(org.booking_slug)
  const html = buildMaintenanceUpsellHtml({
    customerName: 'Valued Customer',
    maintenanceUrl,
    businessName: org.name || 'Your Detailer',
    businessPhone: org.booking_contact_phone || undefined,
    businessEmail: org.booking_contact_email || undefined,
    businessLogo: org.logo_url || null,
    primaryColor: org.primary_color || null,
    accentColor: org.accent_color || null,
    theme: org.theme || null,
    headerTextColor: org.booking_header_text_color || null,
    discountText,
  })
  const textFallback = `Hi Valued Customer, time for a refresh? Book your next detail: ${maintenanceUrl}${discountText ? ` ${discountText}` : ''}`
  const sendResult = await sendEmail(to, `Test: ${subjectLine}`, textFallback, html, fromAddr)

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Test email sent to ${to}. Click the link to verify the discount applies.` })
}
