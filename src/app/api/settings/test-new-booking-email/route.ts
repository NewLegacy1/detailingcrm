import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'
import { buildNewBookingNotificationHtml } from '@/lib/email-templates/new-booking-notification'
import { formatScheduledAtForCustomer } from '@/lib/format-scheduled-at-display'

const CRM_BASE =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

/** Send a test "You have a new booking!" email to verify the template. */
export async function POST(req: NextRequest) {
  const result = await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  if ('error' in result) return result.error

  const { auth } = result
  const orgId = auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const supabase = await createClient()

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
    .select('id, name, logo_url, booking_slug, booking_service_area_label, timezone')
    .eq('id', orgId)
    .single()

  if (orgErr || !org?.id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const businessName = (org.name ?? 'Your business').trim()
  const serviceAreaLabel = (org.booking_service_area_label ?? businessName).trim()
  const html = buildNewBookingNotificationHtml({
    businessName,
    detailOpsLogoUrl: `${CRM_BASE}/detailopslogo.png`,
    logoUrl: org.logo_url ?? null,
    customerName: 'Test Customer',
    serviceName: 'Basic Interior Detail',
    scheduledAt: formatScheduledAtForCustomer(
      new Date(Date.now() + 86400000).toISOString(),
      org.timezone as string | null | undefined
    ),
    address: '123 Sample St, Your City, ON L0L 0L0',
    jobId: '00000000-0000-0000-0000-000000000000',
    orderId: 'TEST1234',
    descriptionLine: 'Basic Detailing · Basic Interior Detail',
    subTotal: '$190.00',
    total: '$190.00',
    customerContact: 'Test Customer · +1 (555) 123-4567',
    serviceAreaLabel,
    crmJobUrl: `${CRM_BASE}/crm/jobs`,
  })

  const fromAddr = getFromAddressForSlug(org.booking_slug)
  const sendResult = await sendEmail(to, 'Test: You have a new booking!', '', html, fromAddr)

  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error ?? 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Test new-booking email sent to ${to}.` })
}
