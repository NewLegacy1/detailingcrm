import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { listCalendars, createCalendar } from '@/lib/google-calendar'

export async function GET() {
  const result = await requirePermission(PERMISSIONS.GOOGLE_CONNECT)
  if ('error' in result) return result.error

  const supabase = await createClient()
  let orgId = result.auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  const { data: org } = await supabase
    .from('organizations')
    .select('google_tokens_encrypted')
    .eq('id', orgId!)
    .single()

  if (!org?.google_tokens_encrypted) {
    return NextResponse.json({ error: 'Not connected' }, { status: 400 })
  }

  try {
    const calendars = await listCalendars(org.google_tokens_encrypted)
    return NextResponse.json(calendars)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to list calendars' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const result = await requirePermission(PERMISSIONS.GOOGLE_CONNECT)
  if ('error' in result) return result.error

  const body = await request.json().catch(() => ({}))
  const summary = (body.summary as string) || 'Detailing Jobs'

  const supabase = await createClient()
  let orgId = result.auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  const { data: org } = await supabase
    .from('organizations')
    .select('google_tokens_encrypted')
    .eq('id', orgId!)
    .single()

  if (!org?.google_tokens_encrypted) {
    return NextResponse.json({ error: 'Not connected' }, { status: 400 })
  }

  try {
    const { id } = await createCalendar(org.google_tokens_encrypted, summary)
    await supabase
      .from('organizations')
      .update({ google_company_calendar_id: id, updated_at: new Date().toISOString() })
      .eq('id', orgId!)
    return NextResponse.json({ id, summary })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to create calendar' }, { status: 400 })
  }
}
