import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function PATCH(request: NextRequest) {
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const rawSlug = typeof body.slug === 'string' ? body.slug : ''
  const slug = normalizeSlug(rawSlug)
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('booking_slug', slug)
    .maybeSingle()

  if (existing && existing.id !== profile.org_id) {
    return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 })
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      booking_slug: slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.org_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ slug })
}
