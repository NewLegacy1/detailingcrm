import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { allowProFeatures } from '@/lib/pro-features'

/** GET /api/locations/[id]/stats — revenue, booking count, utilization for this location. Pro only. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await params
  const result = await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  if ('error' in result) return result.error
  const orgId = result.auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  if (result.auth.locationId && result.auth.locationId !== locationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()
  if (!allowProFeatures(org?.subscription_plan)) {
    return NextResponse.json({ error: 'Pro plan required' }, { status: 403 })
  }

  const { data: location } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('org_id', orgId)
    .single()
  if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, base_price, size_price_offset, discount_amount, scheduled_at')
    .eq('location_id', locationId)
    .in('status', ['scheduled', 'in_progress', 'done'])

  const { data: payments } = await supabase
    .from('job_payments')
    .select('job_id, amount')
    .in('job_id', (jobs ?? []).map((j: { id: string }) => j.id))

  const bookingCount = jobs?.length ?? 0
  const revenueFromPayments = (payments ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  const revenueFromJobs = (jobs ?? []).reduce(
    (sum: number, j: { base_price?: number; size_price_offset?: number; discount_amount?: number }) =>
      sum + (Number(j.base_price ?? 0) + Number(j.size_price_offset ?? 0) - Number(j.discount_amount ?? 0)),
    0
  )

  return NextResponse.json({
    location_id: locationId,
    booking_count: bookingCount,
    revenue_from_payments: Math.round(revenueFromPayments * 100) / 100,
    revenue_estimated: Math.round(revenueFromJobs * 100) / 100,
  })
}
