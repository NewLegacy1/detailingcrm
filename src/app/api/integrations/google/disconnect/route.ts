import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function POST() {
  const result = await requirePermission(PERMISSIONS.GOOGLE_DISCONNECT)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()
  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  await supabase
    .from('organizations')
    .update({
      google_company_calendar_id: null,
      google_tokens_encrypted: null,
      google_token_meta: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  return NextResponse.json({ ok: true })
}
