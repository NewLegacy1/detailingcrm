import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'

/** Delete a customer (client). RLS ensures org scope. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const supabase = await createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('clients').delete().eq('id', clientId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Delete customer error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
