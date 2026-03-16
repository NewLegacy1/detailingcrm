import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

export interface ImportRow {
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return ''
  return phone.replace(/\D/g, '').trim()
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthClient()
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

    const imported: { id: string; name: string; merged?: boolean }[] = []
    for (const row of rows) {
      const name = String(row?.name ?? '').trim()
      if (!name) continue
      const email = row.email ? String(row.email).trim() || null : null
      const phone = row.phone ? String(row.phone).trim() || null : null
      const company = row.company ? String(row.company).trim() || null : null
      const address = row.address ? String(row.address).trim() || null : null
      const notes = row.notes ? String(row.notes).trim() || null : null

      let existingId: string | null = null
      if (email) {
        const { data: byEmail } = await supabase
          .from('clients')
          .select('id')
          .eq('org_id', orgId)
          .ilike('email', email)
          .limit(1)
          .maybeSingle()
        if (byEmail?.id) existingId = byEmail.id
      }
      if (!existingId && phone) {
        const digits = normalizePhone(phone)
        if (digits.length >= 7) {
          const { data: allClients } = await supabase
            .from('clients')
            .select('id, phone')
            .eq('org_id', orgId)
            .not('phone', 'is', null)
          const match = (allClients ?? []).find((c) => normalizePhone(c.phone) === digits)
          if (match?.id) existingId = match.id
        }
      }

      if (existingId) {
        const { data: existing } = await supabase
          .from('clients')
          .select('name, email, phone, company, address, notes')
          .eq('id', existingId)
          .single()
        if (existing) {
          const updates: Record<string, string | null> = {}
          if (name) updates.name = name
          if (email !== undefined) updates.email = email || existing.email
          if (phone !== undefined) updates.phone = phone || existing.phone
          if (company !== undefined) updates.company = company || existing.company
          if (address !== undefined) updates.address = address || existing.address
          if (notes !== undefined) updates.notes = notes || existing.notes
          const { data: updated, error: updateErr } = await supabase
            .from('clients')
            .update(updates)
            .eq('id', existingId)
            .select('id, name')
            .single()
          if (!updateErr && updated) {
            imported.push({ id: updated.id, name: updated.name, merged: true })
          }
        }
        continue
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({
          name,
          email,
          phone,
          company,
          address,
          notes,
          created_by: user.id,
          org_id: orgId,
        })
        .select('id, name')
        .single()
      if (error) {
        console.error('Import row error:', error)
        continue
      }
      if (data) imported.push(data)
    }

    return NextResponse.json({
      imported: imported.length,
      merged: imported.filter((c) => c.merged).length,
      customers: imported,
    })
  } catch (err) {
    console.error('Customers import error:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
