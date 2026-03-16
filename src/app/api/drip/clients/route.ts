import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

const ALLOWED_ROLES = ['owner', 'admin', 'manager'] as const

/** GET: list clients for current org (id, name, email, phone) for test-run dropdown */
export async function GET() {
  const auth = await getAuthAndPermissions()
  if (!auth?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(ALLOWED_ROLES as readonly string[]).includes(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, phone')
    .eq('org_id', auth.orgId)
    .order('name')
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
