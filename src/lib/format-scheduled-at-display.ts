/** Fallback when org has no timezone set (matches CRM job creation default). */
export const DEFAULT_ORG_TIMEZONE = 'America/Toronto'

/**
 * Format a job's scheduled_at (UTC ISO) for customer-facing text (email/SMS).
 * Always pass the org's IANA timezone — server runtime is often UTC and would otherwise show the wrong clock time.
 */
export function formatScheduledAtForCustomer(
  scheduledAtIso: string | null | undefined,
  orgTimeZone: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const trimmed = scheduledAtIso?.trim()
  if (!trimmed) return ''
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return ''
  const timeZone = (orgTimeZone && orgTimeZone.trim()) || DEFAULT_ORG_TIMEZONE
  const fmt: Intl.DateTimeFormatOptions = options ?? {
    dateStyle: 'full',
    timeStyle: 'short',
  }
  return d.toLocaleString('en-US', { ...fmt, timeZone })
}
