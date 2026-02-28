import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, sendSms } from '@/lib/notifications'

const CRON_SECRET = process.env.CRON_SECRET

function authCron(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const header = req.headers.get('x-cron-secret')
  return bearer === CRON_SECRET || header === CRON_SECRET
}

export async function GET(req: NextRequest) {
  if (!authCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()
  const results = { review: 0, reminder: 0, maintenance: 0, errors: [] as string[] }

  // 1) Review follow-up: jobs done X days ago, review_request_sent_at null
  const { data: orgs } = await supabase.from('organizations').select('id, review_follow_up_days, review_page_url').not('review_page_url', 'is', null)
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
    for (const job of jobs ?? []) {
      const { data: client } = await supabase.from('clients').select('phone, name').eq('id', job.customer_id).single()
      const phone = client?.phone?.trim()
      const reviewUrl = (org.review_page_url ?? '').replace(/\{jobId\}/g, job.id)
      if (phone && reviewUrl) {
        const body = `Thanks for choosing us! Please share your experience: ${reviewUrl}`
        const r = await sendSms(phone, body)
        if (r.ok) {
          await supabase.from('communications').insert({ client_id: job.customer_id, job_id: job.id, channel: 'sms', direction: 'out', body, external_id: r.externalId ?? undefined })
          await supabase.from('jobs').update({ review_request_sent_at: new Date().toISOString() }).eq('id', job.id)
          results.review++
        } else results.errors.push(`review job ${job.id}: ${r.error}`)
      }
    }
  }

  // 2) Job reminders: scheduled in next job_reminder_mins, reminder_sent_at null
  const now = new Date()
  const { data: orgs2 } = await supabase.from('organizations').select('id, job_reminder_mins, job_reminder_email_on')
  for (const org of orgs2 ?? []) {
    const mins = Math.max(0, Number(org.job_reminder_mins) ?? 60)
    const windowEnd = new Date(now.getTime() + mins * 60 * 1000)
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_id, scheduled_at')
      .eq('org_id', org.id)
      .in('status', ['scheduled', 'en_route'])
      .is('reminder_sent_at', null)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', windowEnd.toISOString())
      .limit(50)
    for (const job of jobs ?? []) {
      const { data: client } = await supabase.from('clients').select('phone, email, name').eq('id', job.customer_id).single()
      const smsBody = `Reminder: Your appointment is at ${new Date(job.scheduled_at).toLocaleString()}. Reply if you need to reschedule.`
      if (client?.phone?.trim()) {
        const r = await sendSms(client.phone.trim(), smsBody)
        if (r.ok) {
          await supabase.from('communications').insert({ client_id: job.customer_id, job_id: job.id, channel: 'sms', direction: 'out', body: smsBody, external_id: r.externalId ?? undefined })
        }
      }
      if (org.job_reminder_email_on && client?.email?.trim()) {
        const emailBody = `Reminder: Your appointment is scheduled for ${new Date(job.scheduled_at).toLocaleString()}.`
        await sendEmail(client.email.trim(), 'Appointment reminder', emailBody)
      }
      await supabase.from('jobs').update({ reminder_sent_at: new Date().toISOString() }).eq('id', job.id)
      results.reminder++
    }
  }

  // 3) Maintenance upsell: done N days ago, N in org.maintenance_upsell_days, N not in job.maintenance_upsell_sent_days
  const { data: orgs3 } = await supabase.from('organizations').select('id, maintenance_upsell_days, maintenance_detail_url').not('maintenance_detail_url', 'is', null)
  const today = new Date().toISOString().slice(0, 10)
  for (const org of orgs3 ?? []) {
    const daysArr: number[] = Array.isArray(org.maintenance_upsell_days) ? org.maintenance_upsell_days : [14, 30, 45]
    const url = org.maintenance_detail_url ?? ''
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_id, updated_at, maintenance_upsell_sent_days')
      .eq('org_id', org.id)
      .eq('status', 'done')
      .limit(500)
    for (const job of jobs ?? []) {
      const sent: number[] = Array.isArray(job.maintenance_upsell_sent_days) ? job.maintenance_upsell_sent_days : []
      const jobDoneDate = job.updated_at?.slice(0, 10)
      if (!jobDoneDate) continue
      for (const day of daysArr) {
        if (sent.includes(day)) continue
        const donePlusDay = new Date(jobDoneDate)
        donePlusDay.setDate(donePlusDay.getDate() + day)
        if (donePlusDay.toISOString().slice(0, 10) !== today) continue
        const { data: client } = await supabase.from('clients').select('phone').eq('id', job.customer_id).single()
        const phone = client?.phone?.trim()
        if (phone) {
          const body = `Time for a refresh? Book your next detail: ${url}`
          const r = await sendSms(phone, body)
          if (r.ok) {
            await supabase.from('communications').insert({ client_id: job.customer_id, job_id: job.id, channel: 'sms', direction: 'out', body, external_id: r.externalId ?? undefined })
            await supabase.from('jobs').update({ maintenance_upsell_sent_days: [...sent, day] }).eq('id', job.id)
            results.maintenance++
            sent.push(day)
          }
        }
        break
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
