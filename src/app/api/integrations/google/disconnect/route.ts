import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function POST() {
  const result = await requirePermission(PERMISSIONS.GOOGLE_DISCONNECT)
  if ('error' in result) return result.error

  const orgId = result.auth.orgId
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const supabase = await createClient()

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
