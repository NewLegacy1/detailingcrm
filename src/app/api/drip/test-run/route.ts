import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

const ALLOWED_ROLES = ['owner', 'admin', 'manager'] as const

type DripNode = { id: string; type: string; data?: Record<string, unknown> }

/** Find the first node that sends (sms or email) so the next cron tick will send immediately. */
function getFirstSendNodeId(nodes: DripNode[]): string | null {
  const send = nodes.find((n) => n.type === 'sms' || n.type === 'email')
  return send?.id ?? null
}

/** Fallback: first node after trigger so the run at least starts. */
function getFirstStepAfterTrigger(nodes: DripNode[], edges: { source: string; target: string }[]): string | null {
  const trigger = nodes.find((n) => n.type === 'trigger')
  if (!trigger) return null
  const edge = edges.find((e) => e.source === trigger.id)
  return edge?.target ?? null
}

/**
 * POST: Create a test drip run. Next cron tick will process it and send the first message (SMS or email) to the given client.
 * Body: { client_id: string, campaign_id?: string }
 * - client_id: must be a client in your org with email (for email step) or phone (for SMS step).
 * - campaign_id: optional; if omitted, uses your first active campaign.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(ALLOWED_ROLES as readonly string[]).includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : null
  const campaignId = typeof body.campaign_id === 'string' ? body.campaign_id.trim() : null

  if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })

  const supabase = await createClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, org_id, email, phone')
    .eq('id', clientId)
    .eq('org_id', auth.orgId)
    .single()

  if (clientError || !client) return NextResponse.json({ error: 'Client not found or not in your org' }, { status: 404 })

  type CampaignRow = { id: string; org_id: string; workflow_json: { nodes: DripNode[]; edges: { source: string; target: string }[] } }
  let campaign: CampaignRow | null = null

  if (campaignId) {
    const { data, error } = await supabase
      .from('drip_campaigns')
      .select('id, org_id, workflow_json')
      .eq('id', campaignId)
      .eq('org_id', auth.orgId)
      .eq('active', true)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Campaign not found or inactive' }, { status: 404 })
    campaign = data as CampaignRow
  } else {
    const { data, error } = await supabase
      .from('drip_campaigns')
      .select('id, org_id, workflow_json')
      .eq('org_id', auth.orgId)
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    if (error || !data) return NextResponse.json({ error: 'No active campaign found. Create one in Drip Marketing first.' }, { status: 404 })
    campaign = data as CampaignRow
  }

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const nodes = campaign.workflow_json?.nodes ?? []
  const edges = campaign.workflow_json?.edges ?? []
  const firstSendNode = getFirstSendNodeId(nodes)
  const currentStep = firstSendNode ?? getFirstStepAfterTrigger(nodes, edges) ?? nodes[0]?.id ?? 'trigger'

  const { data: run, error: runError } = await supabase
    .from('drip_runs')
    .insert({
      campaign_id: campaign.id,
      org_id: auth.orgId,
      customer_id: client.id,
      job_id: null,
      booking_session_id: null,
      current_step: currentStep,
      status: 'running',
      variables: {},
      next_step_at: null,
    })
    .select('id')
    .single()

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  const willSendNow = !!firstSendNode
  return NextResponse.json({
    run_id: run?.id,
    current_step: currentStep,
    message: willSendNow
      ? 'Test run created. The next cron tick (or a manual cron trigger) will send the first message to this client.'
      : 'Test run created. The first step is not a send (e.g. it’s a wait). Cron will advance the run; you may need to wait for a later step to receive a message.',
  })
}
