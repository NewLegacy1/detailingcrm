import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

/**
 * Stub: send reschedule (or other) notification to customer via email or SMS.
 * Extend later with real email/SMS provider.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(PERMISSIONS.SCHEDULE_MANAGE)
  if ('error' in result) return result.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const type = body.type as string
  const scheduledAt = body.scheduledAt as string
  const newStart = body.newStart as string
  const newEnd = body.newEnd as string
  const sendSms = !!body.sendSms
  const sendEmail = !!body.sendEmail

  // TODO: load job + client; when sendSms/sendEmail true, send via Twilio/Resend with new time
  if (type === 'reschedule' && (sendSms || sendEmail)) {
    // Placeholder: in production, fetch job + client and send SMS/email with newStart/newEnd
  }

  return NextResponse.json({ ok: true })
}
