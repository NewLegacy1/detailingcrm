import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** POST /api/booking/register
 * Body: { slug, email, password, name?, phone? }
 * Creates auth user, creates or matches client for org, links via booking_customer_accounts.
 * Client should then sign in with signInWithPassword to get a session.
 */
export async function POST(req: NextRequest) {
  let body: { slug?: string; email?: string; password?: string; name?: string; phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null

  if (!slug || !email || !password) {
    return NextResponse.json(
      { error: 'slug, email, and password are required' },
      { status: 400 }
    )
  }

  const emailNorm = email.toLowerCase()
  const supabase = await createServiceRoleClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('booking_slug', slug)
    .single()

  if (orgError || !org?.id) {
    return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 })
  }

  const orgId = org.id

  let userId: string

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: emailNorm,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message?.toLowerCase().includes('already registered')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Sign in instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: authError.message ?? 'Failed to create account' },
      { status: 400 }
    )
  }

  if (!authData?.user?.id) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  userId = authData.user.id

  let clientId: string

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('org_id', orgId)
    .ilike('email', emailNorm)
    .limit(1)
    .maybeSingle()

  if (existingClient?.id) {
    clientId = existingClient.id
    await supabase
      .from('clients')
      .update({
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
      })
      .eq('id', clientId)
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        org_id: orgId,
        name: name || emailNorm.split('@')[0],
        email: emailNorm,
        phone: phone,
      })
      .select('id')
      .single()

    if (clientError || !newClient?.id) {
      return NextResponse.json(
        { error: 'Failed to create customer profile' },
        { status: 500 }
      )
    }
    clientId = newClient.id
  }

  const { error: linkError } = await supabase.from('booking_customer_accounts').insert({
    user_id: userId,
    org_id: orgId,
    client_id: clientId,
  })

  if (linkError) {
    if (linkError.code === '23505') {
      return NextResponse.json(
        { error: 'Account already linked for this business. Sign in instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: linkError.message ?? 'Failed to link account' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
