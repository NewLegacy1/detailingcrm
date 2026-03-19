import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'
import { notifyNewBooking } from '@/lib/notify-new-booking'

export async function POST(req: NextRequest) {
  const result = await requirePermission(PERMISSIONS.SCHEDULE_MANAGE)
  if ('error' in result) return result.error

  const body = await req.json().catch(() => ({}))
  const jobId = body.jobId ?? body.job_id
  if (!jobId || typeof jobId !== 'string') return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const sendClientEmailOverride = typeof body.sendClientEmail === 'boolean' ? body.sendClientEmail : undefined
  const forceBusinessEmail = body.forceBusinessEmail === true

  const supabase = await createClient()
  const { sent } = await notifyNewBooking(supabase, jobId, { sendClientEmailOverride, forceBusinessEmail })
  return NextResponse.json({ ok: true, sent })
}
