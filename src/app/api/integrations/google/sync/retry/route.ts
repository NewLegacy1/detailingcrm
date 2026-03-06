import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  const result = await requirePermission(PERMISSIONS.GOOGLE_SYNC_RETRY)
  if ('error' in result) return result.error

  const body = await request.json().catch(() => ({}))
  const jobId = body.jobId as string
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  const origin = request.nextUrl.origin
  const res = await fetch(`${origin}/api/integrations/google/sync/job/${jobId}`, {
    method: 'POST',
    headers: { cookie: request.headers.get('cookie') ?? '' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok && res.status !== 200) {
    return NextResponse.json(data, { status: res.status })
  }
  return NextResponse.json(data)
}
