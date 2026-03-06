import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

const STARTER_JOBS_LIMIT = 60

/**
 * POST: Create a job from the CRM (authenticated). Enforces Starter 60 jobs/month cap.
 * Body: { customer_id, vehicle_id?, service_id?, scheduled_at, address, notes?, base_price?, size_price_offset? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }

  let body: {
    customer_id?: string
    vehicle_id?: string | null
    service_id?: string | null
    scheduled_at?: string
    address?: string
    notes?: string | null
    base_price?: number
    size_price_offset?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const customer_id = typeof body.customer_id === 'string' ? body.customer_id.trim() : ''
  const scheduled_at = typeof body.scheduled_at === 'string' ? body.scheduled_at.trim() : ''
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  if (!customer_id || !scheduled_at || !address) {
    return NextResponse.json({ error: 'customer_id, scheduled_at, and address are required' }, { status: 400 })
  }

  const scheduledDate = new Date(scheduled_at)
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduled_at' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()

  if (org?.subscription_plan === 'starter') {
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', startOfMonth)
    if ((count ?? 0) >= STARTER_JOBS_LIMIT) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      return NextResponse.json(
        {
          error: 'Starter plan is limited to 60 jobs per month. Upgrade to Pro for unlimited jobs.',
          upgradeUrl: `${baseUrl}/crm/settings/plan`,
        },
        { status: 403 }
      )
    }
  }

  const vehicle_id = typeof body.vehicle_id === 'string' && body.vehicle_id.trim() ? body.vehicle_id.trim() : null
  const service_id = typeof body.service_id === 'string' && body.service_id.trim() ? body.service_id.trim() : null
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  const base_price = typeof body.base_price === 'number' ? body.base_price : 0
  const size_price_offset = typeof body.size_price_offset === 'number' ? body.size_price_offset : 0

  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      customer_id,
      vehicle_id,
      service_id,
      scheduled_at: scheduledDate.toISOString(),
      address,
      status: 'scheduled',
      org_id: orgId,
      notes,
      base_price,
      size_price_offset,
    })
    .select('id')
    .single()

  if (jobError || !newJob?.id) {
    return NextResponse.json({ error: jobError?.message ?? 'Failed to create job' }, { status: 500 })
  }

  try {
    const { data: defaultItems } = await supabase
      .from('organization_default_checklist')
      .select('label, sort_order')
      .eq('org_id', orgId)
      .order('sort_order')
    if (defaultItems?.length) {
      await supabase.from('job_checklist_items').insert(
        defaultItems.map((item) => ({ job_id: newJob.id, label: item.label, sort_order: item.sort_order, checked: false }))
      )
    }
  } catch (_) {}

  return NextResponse.json({ id: newJob.id })
}
