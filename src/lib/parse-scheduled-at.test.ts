import { describe, it, expect } from 'vitest'
import { parseScheduledAtInTimezone } from './parse-scheduled-at'

describe('parseScheduledAtInTimezone', () => {
  const TZ = 'America/Toronto' // Eastern: UTC-5 (EST) or UTC-4 (EDT)

  it('parses datetime-local string (no Z) as org local time', () => {
    // March 12, 2026 11:30 AM in Toronto (EDT = UTC-4) => 15:30 UTC
    const result = parseScheduledAtInTimezone('2026-03-12T11:30', TZ)
    expect(result).not.toBeNull()
    expect(result!.toISOString()).toBe('2026-03-12T15:30:00.000Z')
  })

  it('parses 9:00 AM Toronto as correct UTC', () => {
    // March 12, 2026 9:00 AM EDT => 13:00 UTC
    const result = parseScheduledAtInTimezone('2026-03-12T09:00', TZ)
    expect(result).not.toBeNull()
    expect(result!.toISOString()).toBe('2026-03-12T13:00:00.000Z')
  })

  it('parses with seconds when provided', () => {
    const result = parseScheduledAtInTimezone('2026-03-12T11:30:00', TZ)
    expect(result).not.toBeNull()
    expect(result!.toISOString()).toBe('2026-03-12T15:30:00.000Z')
  })

  it('leaves ISO string with Z unchanged', () => {
    const result = parseScheduledAtInTimezone('2026-03-12T15:30:00.000Z', TZ)
    expect(result).not.toBeNull()
    expect(result!.toISOString()).toBe('2026-03-12T15:30:00.000Z')
  })

  it('leaves ISO string with offset unchanged', () => {
    const result = parseScheduledAtInTimezone('2026-03-12T11:30:00-04:00', TZ)
    expect(result).not.toBeNull()
    expect(result!.toISOString()).toBe('2026-03-12T15:30:00.000Z')
  })

  it('returns null for empty string', () => {
    expect(parseScheduledAtInTimezone('', TZ)).toBeNull()
    expect(parseScheduledAtInTimezone('   ', TZ)).toBeNull()
  })
})
