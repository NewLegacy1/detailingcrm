/**
 * Pure helpers used by the drip cron. Exported for testing.
 */
export function replaceDripVariables(
  template: string,
  vars: Record<string, string>
): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value ?? '')
  }
  return out
}

export function parseDuration(d: string): number {
  const match = d.trim().toLowerCase().match(/^(\d+)(h|d|m)$/)
  if (!match) return 24 * 60 * 60 * 1000
  const n = parseInt(match[1], 10)
  const unit = match[2]
  if (unit === 'm') return n * 60 * 1000
  if (unit === 'h') return n * 60 * 60 * 1000
  if (unit === 'd') return n * 24 * 60 * 60 * 1000
  return 24 * 60 * 60 * 1000
}
