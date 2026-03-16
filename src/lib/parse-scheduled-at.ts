import { fromZonedTime } from 'date-fns-tz'

/**
 * Parse scheduled_at in org timezone.
 * datetime-local sends "YYYY-MM-DDTHH:mm" (no TZ) — server must treat as org local time, not UTC.
 */
export function parseScheduledAtInTimezone(scheduled_at: string, timeZone: string): Date | null {
  const trimmed = scheduled_at.trim()
  if (!trimmed) return null
  // Already has explicit timezone (Z or ±HH:MM) — parse as-is
  if (/Z$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // datetime-local style: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" — treat as local time in org timezone
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/)
  if (!match) {
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const [, y, m, d, h, min, sec] = match
  const year = parseInt(y!, 10)
  const month = parseInt(m!, 10) - 1
  const day = parseInt(d!, 10)
  const hour = parseInt(h!, 10)
  const minute = parseInt(min!, 10)
  const second = parseInt(sec ?? '0', 10)
  const localDate = new Date(year, month, day, hour, minute, second, 0)
  return fromZonedTime(localDate, timeZone)
}
