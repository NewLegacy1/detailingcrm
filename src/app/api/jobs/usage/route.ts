import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

const STARTER_JOBS_LIMIT = 60

/**
 * GET: Returns current month job count and limit for the authenticated org (for Starter plan usage display).
 * Returns: { count, limit, plan }
 */
export async function GET() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return NextResponse.json({ count: 0, limit: STARTER_JOBS_LIMIT, plan: null }, { status: 200 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()

  const plan = org?.subscription_plan ?? null
  const limit = plan === 'starter' ? STARTER_JOBS_LIMIT : null

  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', startOfMonth)

  return NextResponse.json({
    count: count ?? 0,
    limit,
    plan,
  })
}
