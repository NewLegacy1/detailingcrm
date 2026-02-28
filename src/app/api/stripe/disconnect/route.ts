import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function POST() {
  const result = await requirePermission(PERMISSIONS.STRIPE_DISCONNECT)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()

  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }

  if (!orgId) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_account_id: null,
      stripe_email: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
