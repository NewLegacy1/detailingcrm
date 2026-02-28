/**
 * Email (Resend) and SMS (Twilio) helpers for automations.
 * Set RESEND_API_KEY, NOTIFICATION_FROM_EMAIL for email; TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER for SMS.
 */

export type NotifyResult = { ok: boolean; error?: string; externalId?: string }

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? ''

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY
  if (!key || !FROM_EMAIL) return { ok: false, error: 'Email not configured (RESEND_API_KEY, NOTIFICATION_FROM_EMAIL)' }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to.trim(),
      subject,
      ...(html ? { html } : { text }),
    })
    if (error) return { ok: false, error: String(error.message ?? error) }
    return { ok: true, externalId: data?.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function sendSms(to: string, body: string): Promise<NotifyResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !fromNumber) return { ok: false, error: 'SMS not configured (TWILIO_*)' }
  try {
    const twilio = (await import('twilio')).default
    const client = twilio(accountSid, authToken)
    const normalized = to.replace(/\D/g, '')
    const toE164 = normalized.length === 10 ? `+1${normalized}` : to.startsWith('+') ? to : `+${normalized}`
    const msg = await client.messages.create({ body, from: fromNumber, to: toE164 })
    return { ok: true, externalId: msg.sid }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
