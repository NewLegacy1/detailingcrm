import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

/**
 * POST /api/customers/merge
 * Body: { keepId: string, removeId: string }
 * Moves all jobs, vehicles, invoices, etc. from removeId to keepId, then deletes removeId.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id ?? null
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const body = await request.json()
    const keepId = typeof body.keepId === 'string' ? body.keepId.trim() : null
    const removeId = typeof body.removeId === 'string' ? body.removeId.trim() : null
    if (!keepId || !removeId || keepId === removeId) {
      return NextResponse.json({ error: 'Invalid keepId or removeId' }, { status: 400 })
    }

    const { data: clients } = await supabase
      .from('clients')
      .select('id, org_id')
      .in('id', [keepId, removeId])
    const keep = clients?.find((c) => c.id === keepId)
    const remove = clients?.find((c) => c.id === removeId)
    if (!keep || !remove || keep.org_id !== orgId || remove.org_id !== orgId) {
      return NextResponse.json({ error: 'Customers not found or access denied' }, { status: 404 })
    }

    await supabase.from('jobs').update({ customer_id: keepId }).eq('customer_id', removeId)
    await supabase.from('vehicles').update({ customer_id: keepId }).eq('customer_id', removeId)
    await supabase.from('invoices').update({ client_id: keepId }).eq('client_id', removeId)
    await supabase.from('communications').update({ client_id: keepId }).eq('client_id', removeId)
    await supabase.from('reviews').update({ client_id: keepId }).eq('client_id', removeId)
    await supabase.from('booking_customer_accounts').delete().eq('client_id', removeId)
    await supabase.from('customer_group_members').delete().eq('client_id', removeId)
    const { data: groupRows } = await supabase
      .from('customer_group_members')
      .select('group_id')
      .eq('client_id', keepId)
    const keepGroupIds = new Set((groupRows ?? []).map((r) => r.group_id))
    const { data: removeGroups } = await supabase
      .from('customer_group_members')
      .select('group_id')
      .eq('client_id', removeId)
    for (const r of removeGroups ?? []) {
      if (!keepGroupIds.has(r.group_id)) {
        await supabase.from('customer_group_members').insert({ client_id: keepId, group_id: r.group_id })
      }
    }

    const { error: delErr } = await supabase.from('clients').delete().eq('id', removeId)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, kept: keepId, removed: removeId })
  } catch (err) {
    console.error('Merge error:', err)
    return NextResponse.json({ error: 'Merge failed' }, { status: 500 })
  }
}
