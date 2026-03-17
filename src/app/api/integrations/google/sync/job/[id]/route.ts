import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/lib/permissions'
import { syncJobToGoogle } from '@/lib/google-calendar-sync'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthAndPermissions()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(auth.permissions, PERMISSIONS.SCHEDULE_MANAGE) && !hasPermission(auth.permissions, PERMISSIONS.INTEGRATIONS_VIEW)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: jobId } = await params
  const orgId = auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const supabase = await createClient()

  const { synced, error } = await syncJobToGoogle(supabase, orgId, jobId)
  if (error) return NextResponse.json({ ok: false, error }, { status: 200 })
  return NextResponse.json({ ok: true, synced })
}
