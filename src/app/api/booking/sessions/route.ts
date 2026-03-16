import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

/** GET: List abandoned booking sessions for the current org (booked = false). */
export async function GET() {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  let query = supabase
    .from('booking_sessions')
    .select('id, name, email, phone, address, step_reached, created_at, updated_at, service_id')
    .eq('org_id', auth.orgId)
    .eq('booked', false)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (auth.locationId) query = query.eq('location_id', auth.locationId)
  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ sessions: data ?? [] })
}
