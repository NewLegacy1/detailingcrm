import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** PATCH: Mark product tour as completed/skipped. Owner only. */
export async function PATCH() {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'pending'
  const isOwner = role === 'owner' || role === 'pending'
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = await createServiceRoleClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        product_tour_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    const { error } = await authClient
      .from('profiles')
      .update({
        product_tour_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }
}
