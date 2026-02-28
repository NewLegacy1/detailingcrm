import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Add or remove a client from a group. Body: { clientId: string, add: boolean } */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const clientId = body?.clientId
    const add = Boolean(body?.add)
    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    if (add) {
      const { error } = await supabase
        .from('customer_group_members')
        .upsert({ client_id: clientId, group_id: groupId }, { onConflict: 'client_id,group_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    } else {
      const { error } = await supabase
        .from('customer_group_members')
        .delete()
        .eq('client_id', clientId)
        .eq('group_id', groupId)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Update group member error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
