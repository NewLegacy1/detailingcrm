import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendReviewRequestForJob } from '@/lib/send-review-request'

/**
 * POST: Trigger review follow-up email for this job (e.g. after manual payment).
 * Idempotent: only sends if review_request_sent_at is null; sets it after send or skip.
 * Call after recording cash/e-transfer/cheque so the customer gets the link right away.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? null
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { id: jobId } = await params
  if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 })

  const { data: job } = await supabase.from('jobs').select('id, org_id').eq('id', jobId).single()
  if (!job || job.org_id !== orgId) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const serviceSupabase = await createServiceRoleClient()
  const result = await sendReviewRequestForJob(serviceSupabase, jobId)
  return NextResponse.json({ ok: result.sent, error: result.error })
}
