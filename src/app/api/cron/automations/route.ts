import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, getFromAddressForSlug } from '@/lib/notifications'

const CRON_SECRET = process.env.CRON_SECRET

function authCron(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const header = req.headers.get('x-cron-secret')
  return bearer === CRON_SECRET || header === CRON_SECRET
}

type ClientVars = {
  name?: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
}

function replaceVariables(
  template: string,
  vars: ClientVars & Record<string, string>
): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`
    out = out.split(placeholder).join(value ?? '')
  }
  return out
}

export async function GET(req: NextRequest) {
  if (!authCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()
  const results = { review: 0, reminder: 0, maintenance: 0, errors: [] as string[] }

  // 1) Review follow-up: jobs done X days ago, review_request_sent_at null — EMAIL only
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, review_follow_up_days, review_page_url, review_request_message, review_request_subject, booking_slug')
    .not('review_page_url', 'is', null)
  for (const org of orgs ?? []) {
    const days = Math.max(0, Number(org.review_follow_up_days) ?? 1)
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceIso = since.toISOString()
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_id, updated_at')
      .eq('org_id', org.id)
      .eq('status', 'done')
      .is('review_request_sent_at', null)
      .lte('updated_at', sinceIso)
      .limit(50)
    const template = (org.review_request_message ?? 'Hi {{name}}, thanks for choosing us! Please share your experience: {{reviewUrl}}').trim()
    for (const job of jobs ?? []) {
      const { data: client } = await supabase.from('clients').select('name, email, phone, company, address, notes').eq('id', job.customer_id).single()
      const email = client?.email?.trim()
      if (!email) continue
      const finalUrl = (org.review_page_url ?? '').replace(/\{jobId\}/g, job.id)
      const body = replaceVariables(template, {
        name: client?.name ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        company: client?.company ?? '',
        address: client?.address ?? '',
        notes: client?.notes ?? '',
        reviewUrl: finalUrl,
      })
      const reviewSubject = (org as { review_request_subject?: string }).review_request_subject?.trim() || 'How was your experience?'
      const fromAddr = getFromAddressForSlug(org.booking_slug)
      const r = await sendEmail(email, reviewSubject, body, undefined, fromAddr)
      if (r.ok) {
        await supabase.from('communications').insert({ client_id: job.customer_id, job_id: job.id, channel: 'email', direction: 'out', body, external_id: r.externalId ?? undefined })
        await supabase.from('jobs').update({ review_request_sent_at: new Date().toISOString() }).eq('id', job.id)
        results.review++
      } else results.errors.push(`review job ${job.id}: ${r.error}`)
    }
  }

  // 2) Job reminders: scheduled in next job_reminder_mins, reminder_sent_at null — EMAIL only
  const now = new Date()
  const { data: orgs2 } = await supabase
    .from('organizations')
    .select('id, job_reminder_mins, job_reminder_client_email_on, job_reminder_sms_message, job_reminder_subject, booking_slug')
  for (const org of orgs2 ?? []) {
    if (org.job_reminder_client_email_on === false) continue
    const mins = Math.max(0, Number(org.job_reminder_mins) ?? 60)
    const windowEnd = new Date(now.getTime() + mins * 60 * 1000)
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_id, scheduled_at, address')
      .eq('org_id', org.id)
      .in('status', ['scheduled', 'en_route'])
      .is('reminder_sent_at', null)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', windowEnd.toISOString())
      .limit(50)
    const template = (org.job_reminder_sms_message ?? 'Hi {{name}}, reminder: your appointment is scheduled for {{scheduledAt}}. Reply if you need to reschedule.').trim()
    for (const job of jobs ?? []) {
      const { data: client } = await supabase.from('clients').select('name, email, phone, company, address, notes').eq('id', job.customer_id).single()
      const email = client?.email?.trim()
      if (!email) {
        await supabase.from('jobs').update({ reminder_sent_at: new Date().toISOString() }).eq('id', job.id)
        results.reminder++
        continue
      }
      const scheduledAt = new Date(job.scheduled_at).toLocaleString()
      const body = replaceVariables(template, {
        name: client?.name ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        company: client?.company ?? '',
        address: (job as { address?: string }).address ?? client?.address ?? '',
        notes: client?.notes ?? '',
        scheduledAt,
      })
      const reminderSubject = (org as { job_reminder_subject?: string }).job_reminder_subject?.trim() || 'Appointment reminder'
      const fromAddr = getFromAddressForSlug(org.booking_slug)
      const r = await sendEmail(email, reminderSubject, body, undefined, fromAddr)
      if (r.ok) {
        await supabase.from('communications').insert({ client_id: job.customer_id, job_id: job.id, channel: 'email', direction: 'out', body, external_id: r.externalId ?? undefined })
      }
      await supabase.from('jobs').update({ reminder_sent_at: new Date().toISOString() }).eq('id', job.id)
      results.reminder++
    }
  }

  // 3) Maintenance upsell: done N days ago — EMAIL only. Link = {origin}/book/{booking_slug}?ref=maintenance&job={id}
  const { data: orgs3 } = await supabase
    .from('organizations')
    .select('id, maintenance_upsell_days, maintenance_detail_url, maintenance_upsell_subject, maintenance_upsell_message, booking_slug, maintenance_discount_type, maintenance_discount_value')
    .not('booking_slug', 'is', null)
  const today = new Date().toISOString().slice(0, 10)
  for (const org of orgs3 ?? []) {
    const bookingSlug = (org.booking_slug ?? '').trim()
    if (!bookingSlug) continue
    const daysArr: number[] = Array.isArray(org.maintenance_upsell_days) ? org.maintenance_upsell_days : [14, 30, 45]
    let baseOrigin = ''
    try {
      const url = org.maintenance_detail_url ?? ''
      if (url) baseOrigin = new URL(url).origin
    } catch (_) {}
    if (!baseOrigin && process.env.NEXT_PUBLIC_APP_URL) baseOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    if (!baseOrigin) baseOrigin = 'https://detailops.vercel.app'
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_id, updated_at, maintenance_upsell_sent_days')
      .eq('org_id', org.id)
      .eq('status', 'done')
      .limit(500)
    const template = (org.maintenance_upsell_message ?? 'Hi {{name}}, time for a refresh? Book your next detail: {{maintenanceUrl}}').trim()
    const discountType = (org as { maintenance_discount_type?: string }).maintenance_discount_type
    const discountValue = Number((org as { maintenance_discount_value?: number }).maintenance_discount_value) || 0
    const maintenanceDiscountLabel =
      discountType === 'percent' && discountValue > 0
        ? `${discountValue}% off`
        : discountType === 'fixed' && discountValue > 0
          ? `$${discountValue} off`
          : ''
    for (const job of jobs ?? []) {
      const sent: number[] = Array.isArray(job.maintenance_upsell_sent_days) ? job.maintenance_upsell_sent_days : []
      const jobDoneDate = job.updated_at?.slice(0, 10)
      if (!jobDoneDate) continue
      for (const day of daysArr) {
        if (sent.includes(day)) continue
        const donePlusDay = new Date(jobDoneDate)
        donePlusDay.setDate(donePlusDay.getDate() + day)
        if (donePlusDay.toISOString().slice(0, 10) !== today) continue
        const { data: client } = await supabase.from('clients').select('name, email, phone, company, address, notes').eq('id', job.customer_id).single()
        const email = client?.email?.trim()
        if (!email) {
          sent.push(day)
          await supabase.from('jobs').update({ maintenance_upsell_sent_days: [...sent] }).eq('id', job.id)
          break
        }
        const maintenanceUrl = `${baseOrigin}/book/${bookingSlug}?ref=maintenance&job=${job.id}`
        const body = replaceVariables(template, {
          name: client?.name ?? '',
          email: client?.email ?? '',
          phone: client?.phone ?? '',
          company: client?.company ?? '',
          address: client?.address ?? '',
          notes: client?.notes ?? '',
          maintenanceUrl,
          maintenanceDiscount: maintenanceDiscountLabel,
        })
        const subject = (org as { maintenance_upsell_subject?: string }).maintenance_upsell_subject?.trim() || 'Time for your next detail?'
        const fromAddr = getFromAddressForSlug(org.booking_slug)
        const r = await sendEmail(email, subject, body, undefined, fromAddr)
        if (r.ok) {
          await supabase.from('communications').insert({ client_id: job.customer_id, job_id: job.id, channel: 'email', direction: 'out', body, external_id: r.externalId ?? undefined })
          await supabase.from('jobs').update({ maintenance_upsell_sent_days: [...sent, day] }).eq('id', job.id)
          results.maintenance++
        }
        break
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
