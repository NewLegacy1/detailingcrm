import { NextResponse } from 'next/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'

export async function GET() {
  const auth = await getAuthAndPermissions()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ permissions: auth.permissions, role: auth.role, roleKey: auth.roleKey })
}
