import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ImportRow {
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id ?? null
    if (!orgId) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 })
    }

    const body = await request.json()
    const rows = body.rows as ImportRow[] | undefined
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty rows' }, { status: 400 })
    }

    const inserted: { id: string; name: string }[] = []
    for (const row of rows) {
      const name = String(row?.name ?? '').trim()
      if (!name) continue
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name,
          email: row.email ? String(row.email).trim() || null : null,
          phone: row.phone ? String(row.phone).trim() || null : null,
          company: row.company ? String(row.company).trim() || null : null,
          address: row.address ? String(row.address).trim() || null : null,
          notes: row.notes ? String(row.notes).trim() || null : null,
          created_by: user.id,
          org_id: orgId,
        })
        .select('id, name')
        .single()
      if (error) {
        console.error('Import row error:', error)
        continue
      }
      if (data) inserted.push(data)
    }

    return NextResponse.json({ imported: inserted.length, customers: inserted })
  } catch (err) {
    console.error('Customers import error:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
