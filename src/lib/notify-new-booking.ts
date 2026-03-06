/**
 * Server-only: send new booking notifications (email/SMS) for a job.
 * Sends to the client (customer) and/or to the business per automation toggles.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, sendSms, getFromAddressForSlug } from '@/lib/notifications'
import { buildNewBookingNotificationHtml } from '@/lib/email-templates/new-booking-notification'
import { buildClientConfirmationHtml } from '@/lib/email-templates/client-confirmation'

const CRM_BASE =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export async function notifyNewBooking(supabase: SupabaseClient, jobId: string): Promise<{ sent: number }> {
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, customer_id, scheduled_at, address, org_id, service_id, base_price, size_price_offset, discount_amount')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) return { sent: 0 }

  const orgId = job.org_id
  if (!orgId) return { sent: 0 }

  const { data: org } = await supabase
    .from('organizations')
    .select(
      'new_booking_email_on, new_booking_sms_on, new_booking_client_email_on, new_booking_client_sms_on, new_booking_user_email_on, new_booking_user_sms_on, booking_slug, booking_contact_email, booking_contact_phone, name, logo_url, booking_service_area_label, primary_color, accent_color, theme, booking_header_text_color'
    )
    .eq('id', orgId)
    .single()

  // Fetch the org owner's profile to get their phone number (public.profiles.phone)
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('org_id', orgId)
    .eq('role', 'owner')
    .maybeSingle()

  const clientEmailOn = org?.new_booking_client_email_on ?? org?.new_booking_email_on ?? true
  const clientSmsOn = org?.new_booking_client_sms_on ?? org?.new_booking_sms_on ?? true
  const userEmailOn = org?.new_booking_user_email_on ?? false
  const userSmsOn = org?.new_booking_user_sms_on ?? false

  if (!clientEmailOn && !clientSmsOn && !userEmailOn && !userSmsOn) return { sent: 0 }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, phone')
    .eq('id', job.customer_id)
    .single()

  if (!client) return { sent: 0 }

  let serviceName = 'Your service'
  if (job.service_id) {
    const { data: svc } = await supabase.from('services').select('name').eq('id', job.service_id).single()
    if (svc?.name) serviceName = svc.name
  }

  const scheduledStr = job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : ''
  const addressStr = job.address ?? ''

  // Business phone: prefer profiles.phone, fall back to org booking_contact_phone
  const businessPhone = ownerProfile?.phone ?? org?.booking_contact_phone ?? ''

  let sent = 0

  // —— Client (customer) confirmation email ——
  if (clientEmailOn && client.email?.trim()) {
    const subject = 'Your Detailing Appointment is Confirmed!'

    const html = buildClientConfirmationHtml({
      customerName: client.name ?? 'there',
      serviceName,
      scheduledAt: scheduledStr,
      address: addressStr,
      businessName: org?.name ?? 'Your Detailer',
      businessPhone,
      businessEmail: org?.booking_contact_email ?? '',
      serviceArea: org?.booking_service_area_label,
      businessLogo: org?.logo_url ?? null,
      primaryColor: org?.primary_color ?? null,
      accentColor: org?.accent_color ?? null,
      theme: org?.theme ?? null,
      headerTextColor: org?.booking_header_text_color ?? null,
    })

    const textFallback = `Hi ${client.name ?? 'there'},\n\nYour ${serviceName} with ${org?.name} is confirmed for ${scheduledStr}${addressStr ? ` at ${addressStr}` : ''}.\n\nQuestions? Call ${businessPhone || 'us'}.`

    const fromAddr = getFromAddressForSlug(org?.booking_slug)
    const r = await sendEmail(client.email.trim(), subject, textFallback, html, fromAddr)

    if (r.ok) {
      await supabase.from('communications').insert({
        client_id: client.id,
        job_id: job.id,
        channel: 'email',
        direction: 'out',
        body: subject + '\n' + textFallback,
        external_id: r.externalId ?? undefined,
      })
      sent++
    }
  }

  if (clientSmsOn && client.phone?.trim()) {
    const body = `Booking confirmed: ${serviceName} on ${scheduledStr}${addressStr ? ` at ${addressStr}` : ''}.`
    const r = await sendSms(client.phone.trim(), body)
    if (r.ok) {
      await supabase.from('communications').insert({
        client_id: client.id,
        job_id: job.id,
        channel: 'sms',
        direction: 'out',
        body,
        external_id: r.externalId ?? undefined,
      })
      sent++
    }
  }

  // —— Business (detailer) new booking notification email ——
  const userEmail = (org?.booking_contact_email ?? '').trim()
  if (userEmailOn && userEmail) {
    const { data: upsells } = await supabase
      .from('job_upsells')
      .select('price')
      .eq('job_id', jobId)

    const upsellTotal = (upsells ?? []).reduce((s, u) => s + Number(u.price ?? 0), 0)
    const basePrice = Number(job.base_price ?? 0)
    const sizeOffset = Number(job.size_price_offset ?? 0)
    const discount = Number(job.discount_amount ?? 0)
    const subTotalNum = basePrice + sizeOffset + upsellTotal - discount
    const subTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.max(0, subTotalNum))
    const total = subTotal

    const orderId = jobId.replace(/-/g, '').slice(-8).toUpperCase()
    const businessName = (org?.name ?? 'Your business').trim()
    const serviceAreaLabel = (org?.booking_service_area_label ?? businessName).trim()
    const customerContact = [client.name, client.phone].filter(Boolean).join(' · ')

    const html = buildNewBookingNotificationHtml({
      businessName,
      detailOpsLogoUrl: `${CRM_BASE}/detailopslogo.png`,
      logoUrl: org?.logo_url ?? null,
      customerName: client.name ?? 'Customer',
      serviceName,
      scheduledAt: scheduledStr,
      address: addressStr,
      jobId,
      orderId,
      descriptionLine: serviceName,
      subTotal,
      total,
      customerContact,
      businessPhone,  // ← now properly pulled from profiles.phone
      serviceAreaLabel,
      crmJobUrl: `${CRM_BASE}/crm/jobs/${jobId}`,
    })

    const fromAddr = getFromAddressForSlug(org?.booking_slug)
    const r = await sendEmail(userEmail, 'You have a new booking!', '', html, fromAddr)
    if (r.ok) sent++
  }

  const userPhone = (org?.booking_contact_phone ?? '').trim()
  if (userSmsOn && userPhone) {
    const body = `New booking: ${client.name ?? 'Customer'} — ${serviceName} on ${scheduledStr}. View: ${CRM_BASE}/crm/jobs/${jobId}`
    const r = await sendSms(userPhone, body)
    if (r.ok) sent++
  }

  return { sent }
}
