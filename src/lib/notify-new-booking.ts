/**
 * Server-only: send new booking notifications (email/SMS) for a job.
 * Used by the CRM notify-new-booking API when a job is created.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, sendSms, getFromAddressForSlug } from '@/lib/notifications'

export async function notifyNewBooking(supabase: SupabaseClient, jobId: string): Promise<{ sent: number }> {
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, customer_id, scheduled_at, address, org_id, service_id')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) return { sent: 0 }
  const orgId = job.org_id
  if (!orgId) return { sent: 0 }

  const { data: org } = await supabase
    .from('organizations')
    .select('new_booking_email_on, new_booking_sms_on, booking_slug')
    .eq('id', orgId)
    .single()

  const emailOn = org?.new_booking_email_on ?? true
  const smsOn = org?.new_booking_sms_on ?? true
  if (!emailOn && !smsOn) return { sent: 0 }

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
  let sent = 0

  if (emailOn && client.email?.trim()) {
    const subject = 'Booking confirmed'
    const text = `Hi ${client.name ?? 'there'}, your ${serviceName} is scheduled for ${scheduledStr}${addressStr ? ` at ${addressStr}` : ''}.`
    const fromAddr = getFromAddressForSlug(org?.booking_slug)
    const r = await sendEmail(client.email.trim(), subject, text, undefined, fromAddr)
    if (r.ok) {
      await supabase.from('communications').insert({
        client_id: client.id,
        job_id: job.id,
        channel: 'email',
        direction: 'out',
        body: subject + '\n' + text,
        external_id: r.externalId ?? undefined,
      })
      sent++
    }
  }
  if (smsOn && client.phone?.trim()) {
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
  return { sent }
}
