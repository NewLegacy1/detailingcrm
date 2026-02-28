import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** Upsert an abandoned booking session. Called at each step transition on the booking page. */
export async function POST(req: NextRequest) {
  let body: {
    slug?: string
    sessionToken?: string
    name?: string
    email?: string
    phone?: string
    serviceId?: string
    address?: string
    stepReached?: string
    booked?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken.trim() : ''
  if (!slug || !sessionToken) {
    return NextResponse.json({ error: 'slug and sessionToken required' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, abandoned_cart_enabled')
    .eq('booking_slug', slug)
    .single()

  if (!org?.id || !org.abandoned_cart_enabled) {
    // Silently succeed when feature is disabled
    return NextResponse.json({ ok: true })
  }

  const now = new Date().toISOString()
  await supabase.from('booking_sessions').upsert(
    {
      org_id: org.id,
      session_token: sessionToken,
      name: body.name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      service_id: body.serviceId ?? null,
      address: body.address ?? null,
      step_reached: body.stepReached ?? null,
      booked: body.booked ?? false,
      updated_at: now,
    },
    { onConflict: 'session_token' }
  )

  return NextResponse.json({ ok: true })
}
