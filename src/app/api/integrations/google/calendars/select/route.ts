import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  const result = await requirePermission(PERMISSIONS.GOOGLE_CONNECT)
  if ('error' in result) return result.error

  const body = await request.json().catch(() => ({}))
  const calendarId = body.calendarId as string
  if (!calendarId || typeof calendarId !== 'string') {
    return NextResponse.json({ error: 'calendarId required' }, { status: 400 })
  }

  const supabase = await createClient()
  let orgId = result.auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const locationId = result.auth.locationId ?? null
  if (locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('org_id', orgId)
      .single()
    if (!loc) return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    const { error } = await supabase
      .from('locations')
      .update({
        google_calendar_id: calendarId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', locationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      google_company_calendar_id: calendarId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
