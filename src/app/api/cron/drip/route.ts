import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendSms, sendEmail, getFromAddressForSlug } from '@/lib/notifications'
import { buildDripEmailHtml } from '@/lib/email-templates/drip-email'
import { replaceDripVariables, parseDuration } from '@/lib/drip-cron-utils'
import { randomBytes } from 'crypto'

const CRON_SECRET = process.env.CRON_SECRET

function authCron(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const header = req.headers.get('x-cron-secret')
  return bearer === CRON_SECRET || header === CRON_SECRET
}

type DripNode = {
  id: string
  type: string
  data?: Record<string, unknown>
  position?: { x: number; y: number }
}
type DripEdge = { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }

/**
 * Find running drip_runs that are due for their next step:
 * - next_step_at is null (first step) or next_step_at <= now()
 * Process one step per run: send_sms, wait, check, end, send_email.
 */
export async function GET(req: NextRequest) {
  if (!authCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const now = new Date().toISOString()

  const { data: runs, error: runsError } = await supabase
    .from('drip_runs')
    .select('id, campaign_id, org_id, customer_id, job_id, booking_session_id, current_step, status, variables, next_step_at')
    .eq('status', 'running')
    .or(`next_step_at.is.null,next_step_at.lte.${now}`)
    .limit(50)

  if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 })

  const results = { processed: 0, errors: [] as string[] }
  let baseOrigin = 'https://detailops.vercel.app'
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try { baseOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin } catch (_) {}
  } else if (process.env.VERCEL_URL) {
    baseOrigin = `https://${process.env.VERCEL_URL}`
  }

  const campaignCache = new Map<string, { workflow_json: unknown; trigger_type: string }>()

  for (const run of runs ?? []) {
    try {
      let campaign = campaignCache.get(run.campaign_id)
      if (!campaign) {
        const { data } = await supabase
          .from('drip_campaigns')
          .select('workflow_json, trigger_type')
          .eq('id', run.campaign_id)
          .single()
        if (data) {
          campaign = data
          campaignCache.set(run.campaign_id, campaign)
        }
      }

      if (!campaign?.workflow_json) {
        await supabase.from('drip_runs').update({ status: 'cancelled', ended_at: now }).eq('id', run.id)
        continue
      }

      const workflow = campaign.workflow_json as { nodes: DripNode[]; edges: DripEdge[] }
      const nodes = workflow.nodes ?? []
      const edges = workflow.edges ?? []
      const currentNode = nodes.find((n) => n.id === run.current_step)
      const variables = (run.variables ?? {}) as Record<string, string>

      if (!currentNode) {
        await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
        results.processed++
        continue
      }

      const nodeType = String(currentNode.type)
      const outEdges = edges.filter((e) => e.source === currentNode.id)

      if (nodeType === 'trigger') {
        const nextEdge = outEdges[0]
        const nextId = nextEdge?.target ?? null
        if (!nextId) {
          await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
        } else {
          await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: null }).eq('id', run.id)
        }
        results.processed++
        continue
      }

      if (nodeType === 'wait') {
        const duration = String((currentNode.data as { duration?: string })?.duration ?? '1d')
        const ms = parseDuration(duration)
        const nextAt = new Date(Date.now() + ms).toISOString()
        const nextEdge = outEdges[0]
        const nextId = nextEdge?.target ?? null
        if (!nextId) {
          await supabase.from('drip_runs').update({ status: 'completed', ended_at: now, next_step_at: null }).eq('id', run.id)
        } else {
          await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: nextAt }).eq('id', run.id)
        }
        results.processed++
        continue
      }

      if (nodeType === 'sms') {
        const phone = await resolvePhone(supabase, run)
        const bodyTemplate = String((currentNode.data as { body?: string })?.body ?? '')
        if (!phone) {
          results.errors.push(`run ${run.id}: no phone`)
          const nextEdge = outEdges[0]
          const nextId = nextEdge?.target
          if (nextId) await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: null }).eq('id', run.id)
          else await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
          results.processed++
          continue
        }
        let runVars = { ...variables }
        if (bodyTemplate.includes('{{trackedBookingUrl}}')) {
          const { data: org } = await supabase.from('organizations').select('booking_slug').eq('id', run.org_id).single()
          const slug = (org?.booking_slug ?? '').trim()
          const targetUrl = slug ? `/book/${slug}` : '/'
          const token = randomBytes(24).toString('base64url')
          const { data: link } = await supabase.from('tracking_links').insert({ run_id: run.id, token, target_url: targetUrl }).select('id').single()
          if (link) {
            runVars.trackedBookingUrl = `${baseOrigin}/r/${token}`
            runVars.trackedLinkId = link.id
          }
        }
        if (run.customer_id) {
          const { data: client } = await supabase.from('clients').select('name, email, phone').eq('id', run.customer_id).single()
          if (client) {
            runVars.customerName = client.name ?? ''
            runVars.customerEmail = client.email ?? ''
            runVars.customerPhone = client.phone ?? ''
          }
        }
        if (run.booking_session_id) {
          const { data: sess } = await supabase.from('booking_sessions').select('name, email, phone').eq('id', run.booking_session_id).single()
          if (sess) {
            if (!runVars.customerName) runVars.customerName = sess.name ?? ''
            if (!runVars.customerEmail) runVars.customerEmail = sess.email ?? ''
            if (!runVars.customerPhone) runVars.customerPhone = sess.phone ?? ''
          }
        }
        const { data: orgName } = await supabase.from('organizations').select('name').eq('id', run.org_id).single()
        if (orgName?.name) runVars.businessName = orgName.name
        const body = replaceDripVariables(bodyTemplate, runVars)
        const smsResult = await sendSms(phone, body)
        if (!smsResult.ok) {
          results.errors.push(`run ${run.id}: SMS send failed`)
          continue
        }
        if (run.customer_id) {
          await supabase.from('communications').insert({
            client_id: run.customer_id,
            job_id: run.job_id ?? undefined,
            channel: 'sms',
            direction: 'out',
            body,
            external_id: smsResult.externalId ?? undefined,
          })
        }
        const nextEdge = outEdges[0]
        const nextId = nextEdge?.target ?? null
        if (!nextId) {
          await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
        } else {
          await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: null, variables: runVars }).eq('id', run.id)
        }
        results.processed++
        continue
      }

      if (nodeType === 'email') {
        const toEmail = await resolveEmail(supabase, run)
        const subjectTemplate = String((currentNode.data as { subject?: string })?.subject ?? '')
        const bodyTemplate = String((currentNode.data as { body?: string })?.body ?? '')
        if (!toEmail) {
          results.errors.push(`run ${run.id}: no email`)
          const nextEdge = outEdges[0]
          const nextId = nextEdge?.target
          if (nextId) await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: null }).eq('id', run.id)
          else await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
          results.processed++
          continue
        }
        const { data: orgRow } = await supabase.from('organizations').select('booking_slug, name, logo_url, primary_color, accent_color, theme, booking_header_text_color').eq('id', run.org_id).single()
        let runVars = { ...variables }
        if (bodyTemplate.includes('{{trackedBookingUrl}}') || subjectTemplate.includes('{{trackedBookingUrl}}')) {
          const slug = (orgRow?.booking_slug ?? '').trim()
          const targetUrl = slug ? `/book/${slug}` : '/'
          const token = randomBytes(24).toString('base64url')
          const { data: link } = await supabase.from('tracking_links').insert({ run_id: run.id, token, target_url: targetUrl }).select('id').single()
          if (link) {
            runVars.trackedBookingUrl = `${baseOrigin}/r/${token}`
            runVars.trackedLinkId = link.id
          }
        }
        if (run.customer_id) {
          const { data: client } = await supabase.from('clients').select('name, email, phone').eq('id', run.customer_id).single()
          if (client) {
            runVars.customerName = client.name ?? ''
            runVars.customerEmail = client.email ?? ''
            runVars.customerPhone = client.phone ?? ''
          }
        }
        if (run.booking_session_id) {
          const { data: sess } = await supabase.from('booking_sessions').select('name, email, phone').eq('id', run.booking_session_id).single()
          if (sess) {
            if (!runVars.customerName) runVars.customerName = sess.name ?? ''
            if (!runVars.customerEmail) runVars.customerEmail = sess.email ?? ''
            if (!runVars.customerPhone) runVars.customerPhone = sess.phone ?? ''
          }
        }
        if (orgRow?.name) runVars.businessName = orgRow.name
        const subject = replaceDripVariables(subjectTemplate, runVars)
        const body = replaceDripVariables(bodyTemplate, runVars)
        const fromAddr = getFromAddressForSlug(orgRow?.booking_slug)
        const html = buildDripEmailHtml({
          bodyContent: body,
          businessName: orgRow?.name ?? 'Your Detailer',
          businessLogo: orgRow?.logo_url ?? null,
          primaryColor: orgRow?.primary_color ?? null,
          accentColor: orgRow?.accent_color ?? null,
          theme: orgRow?.theme ?? null,
          headerTextColor: orgRow?.booking_header_text_color ?? null,
        })
        const emailResult = await sendEmail(toEmail, subject, body, html, fromAddr)
        if (!emailResult.ok) {
          results.errors.push(`run ${run.id}: email send failed`)
          continue
        }
        if (run.customer_id) {
          await supabase.from('communications').insert({
            client_id: run.customer_id,
            job_id: run.job_id ?? undefined,
            channel: 'email',
            direction: 'out',
            body,
            external_id: emailResult.externalId ?? undefined,
          })
        }
        const nextEdge = outEdges[0]
        const nextId = nextEdge?.target ?? null
        if (!nextId) {
          await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
        } else {
          await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: null, variables: runVars }).eq('id', run.id)
        }
        results.processed++
        continue
      }

      if (nodeType === 'check') {
        const condition = String((currentNode.data as { condition?: string })?.condition ?? '')
        let branch: 'true' | 'false' = 'false'
        if (condition === 'booking_completed') {
          const booked = await checkBookingCompleted(supabase, run)
          branch = booked ? 'true' : 'false'
        } else if (condition === 'link_opened') {
          const opened = await checkLinkOpened(supabase, run, variables)
          branch = opened ? 'true' : 'false'
        }
        const nextEdge = outEdges.find((e) => e.sourceHandle === branch) ?? outEdges[0]
        const nextId = nextEdge?.target ?? null
        if (!nextId) {
          await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
        } else {
          await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: null }).eq('id', run.id)
        }
        results.processed++
        continue
      }

      if (nodeType === 'end') {
        await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
        results.processed++
        continue
      }

      const nextEdge = outEdges[0]
      const nextId = nextEdge?.target ?? null
      if (!nextId) {
        await supabase.from('drip_runs').update({ status: 'completed', ended_at: now }).eq('id', run.id)
      } else {
        await supabase.from('drip_runs').update({ current_step: nextId, next_step_at: null }).eq('id', run.id)
      }
      results.processed++
    } catch (e) {
      results.errors.push(`run ${run.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({ ok: true, ...results })
}

async function resolvePhone(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  run: { customer_id: string | null; booking_session_id: string | null }
): Promise<string | null> {
  if (run.customer_id) {
    const { data } = await supabase.from('clients').select('phone').eq('id', run.customer_id).single()
    return data?.phone?.trim() ?? null
  }
  if (run.booking_session_id) {
    const { data } = await supabase.from('booking_sessions').select('phone').eq('id', run.booking_session_id).single()
    return data?.phone?.trim() ?? null
  }
  return null
}

async function resolveEmail(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  run: { customer_id: string | null; booking_session_id: string | null }
): Promise<string | null> {
  if (run.customer_id) {
    const { data } = await supabase.from('clients').select('email').eq('id', run.customer_id).single()
    return data?.email?.trim() ?? null
  }
  if (run.booking_session_id) {
    const { data } = await supabase.from('booking_sessions').select('email').eq('id', run.booking_session_id).single()
    return data?.email?.trim() ?? null
  }
  return null
}

async function checkBookingCompleted(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  run: { booking_session_id: string | null }
): Promise<boolean> {
  if (!run.booking_session_id) return false
  const { data } = await supabase.from('booking_sessions').select('booked').eq('id', run.booking_session_id).single()
  return data?.booked === true
}

async function checkLinkOpened(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  _run: { id: string },
  variables: Record<string, string>
): Promise<boolean> {
  const linkId = variables['trackedLinkId']
  if (!linkId) return false
  const { data } = await supabase.from('tracking_links').select('visited_at').eq('id', linkId).single()
  return data?.visited_at != null
}
