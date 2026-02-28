import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.onboarding_step === 'string') updates.onboarding_step = body.onboarding_step
  if (typeof body.onboarding_complete === 'boolean') updates.onboarding_complete = body.onboarding_complete

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
