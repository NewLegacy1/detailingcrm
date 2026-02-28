import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { getCalendarSummary } from '@/lib/google-calendar'

export async function GET() {
  const result = await requirePermission(PERMISSIONS.INTEGRATIONS_VIEW)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()
  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ connected: false, calendarId: null, calendarName: null, options: {} })

  const { data: org } = await supabase
    .from('organizations')
    .select('google_company_calendar_id, google_tokens_encrypted, google_sync_to_company, google_sync_to_employee, google_move_on_reassign')
    .eq('id', orgId)
    .single()

  const connected = !!org?.google_tokens_encrypted
  const calendarId = org?.google_company_calendar_id ?? null
  let calendarName: string | null = null
  if (calendarId && org?.google_tokens_encrypted) {
    try {
      calendarName = await getCalendarSummary(org.google_tokens_encrypted, calendarId)
    } catch {
      // Decrypt or API error: still show we're connected and which calendar id
    }
  }

  return NextResponse.json({
    connected,
    calendarId,
    calendarName: calendarName ?? calendarId ?? null,
    options: {
      syncToCompany: org?.google_sync_to_company ?? true,
      syncToEmployee: org?.google_sync_to_employee ?? false,
      moveOnReassign: org?.google_move_on_reassign ?? true,
    },
  })
}
