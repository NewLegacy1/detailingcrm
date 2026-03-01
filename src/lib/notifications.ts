/**
 * Email (Resend) and SMS (Twilio) helpers for automations.
 * Set RESEND_API_KEY, NOTIFICATION_EMAIL_DOMAIN (e.g. contact.newlegacyai.ca) for email.
 * Emails are sent from {booking_slug}@{domain} when fromAddress is provided.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER for SMS.
 */

export type NotifyResult = { ok: boolean; error?: string; externalId?: string }

const EMAIL_DOMAIN = process.env.NOTIFICATION_EMAIL_DOMAIN ?? ''
const FALLBACK_FROM = process.env.NOTIFICATION_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? ''

function getFromEmail(fromAddress?: string): string {
  if (fromAddress) return fromAddress
  if (FALLBACK_FROM) return FALLBACK_FROM
  if (EMAIL_DOMAIN) return `noreply@${EMAIL_DOMAIN}`
  return ''
}

/** Build from-address from org booking slug: e.g. showroom-autocare@contact.newlegacyai.ca */
export function getFromAddressForSlug(slug: string | null | undefined): string | undefined {
  if (!EMAIL_DOMAIN || !slug?.trim()) return undefined
  const safe = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!safe) return undefined
  return `${safe}@${EMAIL_DOMAIN}`
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  fromAddress?: string
): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY
  const from = getFromEmail(fromAddress)
  if (!key || !from) return { ok: false, error: 'Email not configured (RESEND_API_KEY, NOTIFICATION_EMAIL_DOMAIN or NOTIFICATION_FROM_EMAIL)' }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from,
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
