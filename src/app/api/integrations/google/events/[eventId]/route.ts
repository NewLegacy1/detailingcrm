import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { updateEventTimes } from '@/lib/google-calendar'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const result = await requirePermission(PERMISSIONS.SCHEDULE_MANAGE)
  if ('error' in result) return result.error

  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const body = await request.json()
  const start = typeof body.start === 'string' ? body.start : null
  const end = typeof body.end === 'string' ? body.end : null
  const summary = typeof body.summary === 'string' ? body.summary : undefined
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end required (ISO date-time strings)' }, { status: 400 })
  }

  const supabase = await createClient()
  const orgId = result.auth.orgId
    ? result.auth.orgId
    : (await supabase.from('organizations').select('id').limit(1).single()).data?.id ?? null
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { data: org } = await supabase
    .from('organizations')
    .select('google_company_calendar_id, google_tokens_encrypted')
    .eq('id', orgId)
    .single()

  if (!org?.google_tokens_encrypted || !org.google_company_calendar_id) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  try {
    await updateEventTimes(
      org.google_tokens_encrypted,
      org.google_company_calendar_id,
      decodeURIComponent(eventId),
      start,
      end,
      summary
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
