import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

function normalizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return ''
  return phone.replace(/\D/g, '').trim()
}

/**
 * GET /api/customers/duplicates
 * Returns groups of clients that are duplicates (same email or same phone within org).
 */
export async function GET() {
  try {
    const supabase = await createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id ?? null
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, email, phone')
      .eq('org_id', orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const byEmail = new Map<string, { id: string; name: string; email: string | null; phone: string | null }[]>()
    const byPhone = new Map<string, { id: string; name: string; email: string | null; phone: string | null }[]>()
    for (const c of clients ?? []) {
      const key = (c.email ?? '').trim().toLowerCase()
      if (key) {
        if (!byEmail.has(key)) byEmail.set(key, [])
        byEmail.get(key)!.push(c)
      }
      const digits = normalizePhone(c.phone)
      if (digits.length >= 7) {
        if (!byPhone.has(digits)) byPhone.set(digits, [])
        byPhone.get(digits)!.push(c)
      }
    }

    const groups: { id: string; name: string; email: string | null; phone: string | null }[][] = []
    const seen = new Set<string>()
    for (const [, arr] of byEmail) {
      if (arr.length > 1) {
        const ids = arr.map((c) => c.id).sort().join(',')
        if (!seen.has(ids)) {
          seen.add(ids)
          groups.push(arr)
        }
      }
    }
    for (const [, arr] of byPhone) {
      if (arr.length > 1) {
        const ids = arr.map((c) => c.id).sort().join(',')
        if (!seen.has(ids)) {
          seen.add(ids)
          groups.push(arr)
        }
      }
    }

    return NextResponse.json({ duplicates: groups })
  } catch (err) {
    console.error('Duplicates error:', err)
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 })
  }
}
