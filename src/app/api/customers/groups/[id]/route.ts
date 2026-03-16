import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

/** Update group (rename). Body: { name: string } */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const supabase = await createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const name = String(body?.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data, error } = await supabase
      .from('customer_groups')
      .update({ name })
      .eq('id', groupId)
      .select('id, name')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('Update customer group error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

/** Delete group (and its members via FK cascade) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
    const supabase = await createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('customer_groups')
      .delete()
      .eq('id', groupId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Delete customer group error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
