import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail, sendSms, getFromAddressForSlug } from '@/lib/notifications'
import { buildAbandonedRecoveryHtml } from '@/lib/email-templates/abandoned-recovery'
import { buildReviewRequestHtml } from '@/lib/email-templates/review-request'
import { buildJobReminderHtml } from '@/lib/email-templates/job-reminder'
import { buildMaintenanceUpsellHtml } from '@/lib/email-templates/maintenance-upsell'
import { startDripRunsForTrigger } from '@/lib/drip-server'
import { formatScheduledAtForCustomer } from '@/lib/format-scheduled-at-display'

const CRON_SECRET = process.env.CRON_SECRET
const BASE_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://detailops.vercel.app')

function authCron(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const header = req.headers.get('x-cron-secret')
  return bearer === CRON_SECRET || header === CRON_SECRET
}

export async function GET(req: NextRequest) {
  if (!authCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const results = { review: 0, reminder: 0, maintenance: 0, abandoned: 0, errors: [] as string[] }

  // ── Review follow-up ──
  const { data: reviewOrgs } = await supabase
    .from('organizations')
    .select('id, name, booking_slug, review_page_url, review_follow_up_hours, logo_url, primary_color, accent_color, theme, booking_header_text_color, booking_contact_phone, booking_contact_email')
    .not('review_follow_up_enabled', 'eq', false)

  for (const org of reviewOrgs ?? []) {
    const hours = Number(org.review_follow_up_hours) || 24
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_id, updated_at')
      .eq('org_id', org.id)
      .eq('status', 'done')
      .is('review_request_sent_at', null)
      .lt('updated_at', since)

    const reviewPageUrl =
      (org.review_page_url ?? '').trim() ||
      (org.booking_slug ? `${BASE_ORIGIN}/review/${org.booking_slug}` : '')

    if (!reviewPageUrl || !jobs?.length) continue

    for (const job of jobs) {
      if (!job.customer_id) continue
      const { data: client } = await supabase.from('clients').select('id, name, email').eq('id', job.customer_id).single()
      const to = client?.email?.trim()
      if (!to || !to.includes('@')) {
        await supabase.from('jobs').update({ review_request_sent_at: new Date().toISOString() }).eq('id', job.id)
        continue
      }
      const reviewUrl = reviewPageUrl.replace(/\{jobId\}/g, job.id)
      const html = buildReviewRequestHtml({
        customerName: client?.name || 'there',
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
      const subject = 'How was your experience?'
      const textFallback = `Hi ${client?.name || 'there'}, thanks for choosing ${org.name || 'us'}! Share your experience: ${reviewUrl}`
      const fromAddr = getFromAddressForSlug(org.booking_slug)
      const r = await sendEmail(to, subject, textFallback, html, fromAddr)
      if (r.ok) {
        await supabase.from('jobs').update({ review_request_sent_at: new Date().toISOString() }).eq('id', job.id)
        results.review++
      } else results.errors.push(`review ${to}: ${r.error}`)
    }
  }

  // ── Job reminders ──
  const { data: reminderOrgs } = await supabase
    .from('organizations')
    .select('id, name, booking_slug, job_reminder_mins, job_reminder_client_email_on, job_reminder_sms_message, job_reminder_subject, logo_url, primary_color, accent_color, theme, booking_header_text_color, booking_contact_phone, booking_contact_email, timezone')
    .not('job_reminder_enabled', 'eq', false)

  const now = new Date()
  for (const org of reminderOrgs ?? []) {
    if (org.job_reminder_client_email_on === false) continue
    const mins = Number(org.job_reminder_mins) || 60
    const windowEnd = new Date(now.getTime() + mins * 60 * 1000)
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_id, scheduled_at')
      .eq('org_id', org.id)
      .in('status', ['scheduled', 'en_route'])
      .is('reminder_sent_at', null)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', windowEnd.toISOString())

    if (!jobs?.length) continue

    const template = (org.job_reminder_sms_message ?? 'Hi {{name}}, reminder: your appointment is scheduled for {{scheduledAt}}. Reply if you need to reschedule.').trim()
    const subject = org.job_reminder_subject?.trim() || 'Appointment reminder'
    const fromAddr = getFromAddressForSlug(org.booking_slug)

    for (const job of jobs) {
      if (!job.customer_id) continue
      const { data: client } = await supabase.from('clients').select('id, name, email').eq('id', job.customer_id).single()
      const to = client?.email?.trim()
      const scheduledAt = job.scheduled_at
        ? formatScheduledAtForCustomer(job.scheduled_at, org.timezone as string | null | undefined)
        : 'your scheduled time'
      let customMessage = template
      for (const [key, value] of Object.entries({
        name: client?.name ?? 'there',
        scheduledAt,
        email: to ?? '',
        phone: '',
        company: '',
        address: '',
        notes: '',
      })) {
        customMessage = customMessage.split(`{{${key}}}`).join(value ?? '')
      }
      const html = buildJobReminderHtml({
        customerName: client?.name || 'there',
        scheduledAt,
        businessName: org.name || 'Your Detailer',
        businessPhone: org.booking_contact_phone || undefined,
        businessEmail: org.booking_contact_email || undefined,
        businessLogo: org.logo_url || null,
        primaryColor: org.primary_color || null,
        accentColor: org.accent_color || null,
        theme: org.theme || null,
        headerTextColor: org.booking_header_text_color || null,
        customMessage,
      })
      const textFallback = `Hi ${client?.name || 'there'}, reminder: your appointment is scheduled for ${scheduledAt}. Reply if you need to reschedule.`
      if (to && to.includes('@')) {
        const r = await sendEmail(to, subject, textFallback, html, fromAddr)
        if (r.ok) {
          await supabase.from('jobs').update({ reminder_sent_at: new Date().toISOString() }).eq('id', job.id)
          results.reminder++
        } else results.errors.push(`reminder ${to}: ${r.error}`)
      } else {
        await supabase.from('jobs').update({ reminder_sent_at: new Date().toISOString() }).eq('id', job.id)
      }
    }
  }

  // ── Maintenance upsell ──
  const { data: maintenanceOrgs } = await supabase
    .from('organizations')
    .select('id, name, booking_slug, maintenance_upsell_days, maintenance_upsell_excluded_service_ids, maintenance_detail_url, maintenance_upsell_subject, maintenance_discount_type, maintenance_discount_value, logo_url, primary_color, accent_color, theme, booking_header_text_color, booking_contact_phone, booking_contact_email')
    .not('maintenance_upsell_enabled', 'eq', false)

  for (const org of maintenanceOrgs ?? []) {
    const days = Array.isArray(org.maintenance_upsell_days) && org.maintenance_upsell_days.length > 0
      ? org.maintenance_upsell_days
      : [14, 30, 45]
    const excludedIds = (org.maintenance_upsell_excluded_service_ids ?? []) as string[]

    for (const day of days) {
      const since = new Date(Date.now() - day * 24 * 60 * 60 * 1000).toISOString()
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, customer_id, service_id, maintenance_upsell_sent_days')
        .eq('org_id', org.id)
        .eq('status', 'done')
        .lt('updated_at', since)

      if (!jobs?.length) continue

      for (const job of jobs) {
        if (!job.customer_id) continue
        const sent = (job.maintenance_upsell_sent_days ?? []) as number[]
        if (sent.includes(day)) continue
        if (job.service_id && excludedIds.includes(job.service_id)) continue

        const { data: client } = await supabase.from('clients').select('id, name, email').eq('id', job.customer_id).single()
        const to = client?.email?.trim()
        if (!to || !to.includes('@')) continue

        let baseUrl = BASE_ORIGIN
        try {
          const customUrl = (org.maintenance_detail_url ?? '').trim()
          if (customUrl) baseUrl = new URL(customUrl).origin
        } catch (_) {}
        const maintenanceUrl = `${baseUrl}/book/${org.booking_slug}?ref=maintenance&job=${job.id}`
        const discountType = org.maintenance_discount_type
        const discountValue = Number(org.maintenance_discount_value) || 0
        const discountText =
          discountType === 'percent' && discountValue > 0
            ? `${discountValue}% off`
            : discountType === 'fixed' && discountValue > 0
              ? `$${discountValue} off`
              : ''

        const html = buildMaintenanceUpsellHtml({
          customerName: client?.name || 'there',
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
        const subject = org.maintenance_upsell_subject?.trim() || 'Time for your next detail?'
        const textFallback = `Hi ${client?.name || 'there'}, time for a refresh? Book your next detail: ${maintenanceUrl}${discountText ? ` ${discountText}` : ''}`
        const fromAddr = getFromAddressForSlug(org.booking_slug)
        const r = await sendEmail(to, subject, textFallback, html, fromAddr)
        if (r.ok) {
          const nextSent = [...sent, day]
          await supabase.from('jobs').update({ maintenance_upsell_sent_days: nextSent }).eq('id', job.id)
          results.maintenance++
        } else results.errors.push(`maintenance ${to}: ${r.error}`)
      }
    }
  }

  // ── Abandoned Booking Recovery ──
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: orgsRaw, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, booking_slug, booking_contact_phone, booking_contact_email, booking_service_area_label, logo_url, primary_color, accent_color, theme, booking_header_text_color')
    .eq('abandoned_cart_enabled', true)

  if (orgErr) {
    console.error('Failed to load orgs for abandoned check:', orgErr)
  }

  const orgs = orgsRaw ?? []

  for (const org of orgs) {
    const { data: abandonedSessions, error: sessionErr } = await supabase
      .from('booking_sessions')
      .select('id, email, name, phone, org_id, created_at, session_token')
      .eq('org_id', org.id)
      .eq('booked', false)
      .lt('created_at', oneHourAgo)
      .not('email', 'is', null)

    if (sessionErr) {
      console.error('Failed to load sessions for org', org.id, sessionErr)
      continue
    }

    const { data: dripCampaign } = await supabase
      .from('drip_campaigns')
      .select('id')
      .eq('org_id', org.id)
      .eq('trigger_type', 'abandoned_booking')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    const useDripAbandoned = !!dripCampaign?.id

    for (const session of abandonedSessions ?? []) {
      if (useDripAbandoned) {
        const { data: existingRun } = await supabase
          .from('drip_runs')
          .select('id')
          .eq('campaign_id', dripCampaign.id)
          .eq('booking_session_id', session.id)
          .eq('status', 'running')
          .limit(1)
          .maybeSingle()
        if (existingRun) continue
        const { started, errors } = await startDripRunsForTrigger(
          'abandoned_booking',
          { org_id: org.id, booking_session_id: session.id, customer_id: null },
          supabase
        )
        if (started > 0) results.abandoned += started
        errors.forEach((e) => results.errors.push(e))
        continue
      }

      // Anti-spam: only send once per session (built-in flow)
      const { data: existing } = await supabase
        .from('communications')
        .select('id')
        .eq('session_token', session.session_token)
        .eq('channel', 'email')
        .limit(1)

      if (existing?.length) {
        console.log('Skipped abandoned (already sent) for session:', session.session_token)
        continue
      }

      const subject = "Don't Miss Out — Finish Your Booking!"
      const resumeUrl = `https://detailops.vercel.app/book/${org.booking_slug}?session_token=${session.session_token}`

      const html = buildAbandonedRecoveryHtml({
        customerName: session.name || 'there',
        resumeUrl,
        businessName: org.name || 'Your Detailer',
        businessPhone: org.booking_contact_phone || '',
        businessEmail: org.booking_contact_email || '',
        serviceArea: org.booking_service_area_label,
        businessLogo: org.logo_url || null,
        primaryColor: org.primary_color || null,
        accentColor: org.accent_color || null,
        theme: org.theme || null,
        headerTextColor: org.booking_header_text_color || null,
        discountOffer: '10% off to finish your booking',
      })

      const textFallback = `Hi ${session.name || 'there'},\n\nYou started booking with ${org.name || 'us'} but didn't finish.\n\nComplete it here: ${resumeUrl}\n\nQuestions? Reply or call.`

      const fromAddr = getFromAddressForSlug(org.booking_slug)

      if (session.email) {
        const r = await sendEmail(session.email, subject, textFallback, html, fromAddr)
        if (r.ok) {
          const { error: insertErr } = await supabase.from('communications').insert({
            client_id: null,
            job_id: null,
            channel: 'email',
            direction: 'out',
            body: subject + '\n' + textFallback,
            external_id: r.externalId ?? undefined,
            session_token: session.session_token,
          })

          if (insertErr) {
            console.error('Failed to log abandoned email:', insertErr)
          } else {
            console.log('Logged abandoned email for session:', session.session_token)
          }

          results.abandoned++
        } else {
          console.error('Abandoned email failed:', r.error)
          results.errors.push(`abandoned email ${session.email}: ${r.error}`)
        }
      }

      if (session.phone) {
        const r = await sendSms(session.phone, textFallback)
        if (r.ok) {
          await supabase.from('communications').insert({
            client_id: null,
            job_id: null,
            channel: 'sms',
            direction: 'out',
            body: textFallback,
            external_id: r.externalId ?? undefined,
            session_token: session.session_token,
          })
          results.abandoned++
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
