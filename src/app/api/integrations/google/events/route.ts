import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { listEvents } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const result = await requirePermission(PERMISSIONS.SCHEDULE_MANAGE)
  if ('error' in result) return result.error

  const { searchParams } = new URL(request.url)
  const timeMin = searchParams.get('timeMin')
  const timeMax = searchParams.get('timeMax')
  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: 'timeMin and timeMax required (ISO date-time)' }, { status: 400 })
  }

  const supabase = await createClient()
  const orgId = result.auth.orgId
    ? result.auth.orgId
    : (await supabase.from('organizations').select('id').limit(1).single()).data?.id ?? null
  if (!orgId) return NextResponse.json({ events: [] })

  const { data: org } = await supabase
    .from('organizations')
    .select('google_company_calendar_id, google_tokens_encrypted')
    .eq('id', orgId)
    .single()

  if (!org?.google_tokens_encrypted || !org.google_company_calendar_id) {
    return NextResponse.json({ events: [] })
  }

  try {
    const events = await listEvents(
      org.google_tokens_encrypted,
      org.google_company_calendar_id,
      timeMin,
      timeMax
    )
    return NextResponse.json({ events })
  } catch {
    // Invalid/corrupted tokens or wrong TOKEN_ENCRYPTION_SECRET: return empty so schedule still loads
    return NextResponse.json({ events: [] })
  }
}
