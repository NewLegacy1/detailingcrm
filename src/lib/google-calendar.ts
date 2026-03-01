/**
 * Server-only: Google OAuth 2.0 + Calendar API helpers.
 * Uses REST (no googleapis dependency). Tokens stored encrypted by caller.
 */

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expiry_date: number
}

function getRedirectUri(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const base = raw ? String(raw).replace(/\/+$/, '') : 'http://localhost:3000'
  return `${base}/api/integrations/google/callback`
}

export function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google OAuth env vars not set')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
  const expiry_date = Date.now() + (data.expires_in * 1000)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date,
  }
}

export async function refreshAccessToken(tokens: GoogleTokens): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret || !tokens.refresh_token) throw new Error('Cannot refresh: missing refresh_token or env')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  const data = (await res.json()) as { access_token: string; expires_in: number }
  return {
    access_token: data.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + (data.expires_in * 1000),
  }
}

async function getValidAccessToken(encryptedTokens: string): Promise<string> {
  const { decrypt, encrypt } = await import('@/lib/token-encryption')
  let tokens: GoogleTokens = JSON.parse(decrypt(encryptedTokens))
  if (tokens.expiry_date < Date.now() + 60_000) {
    tokens = await refreshAccessToken(tokens)
    // Caller can persist updated tokens if desired
  }
  return tokens.access_token
}

export interface CalendarListEntry {
  id: string
  summary: string
  primary?: boolean
}

export async function listCalendars(encryptedTokens: string): Promise<CalendarListEntry[]> {
  const accessToken = await getValidAccessToken(encryptedTokens)
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to list calendars')
  const data = (await res.json()) as { items?: Array<{ id: string; summary: string; primary?: boolean }> }
  return (data.items || []).map((c) => ({ id: c.id, summary: c.summary, primary: c.primary }))
}

/** Get a single calendar's summary (name) by id. Used to show which calendar we're syncing to. */
export async function getCalendarSummary(encryptedTokens: string, calendarId: string): Promise<string | null> {
  try {
    const accessToken = await getValidAccessToken(encryptedTokens)
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { summary?: string }
    return data.summary ?? null
  } catch {
    return null
  }
}

export async function createCalendar(encryptedTokens: string, summary: string): Promise<{ id: string }> {
  const accessToken = await getValidAccessToken(encryptedTokens)
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ summary }),
  })
  if (!res.ok) throw new Error('Failed to create calendar')
  const data = (await res.json()) as { id: string }
  return { id: data.id }
}

export interface JobForEvent {
  id: string
  scheduled_at: string
  address: string
  notes: string | null
  clientName: string
  vehicleSummary: string
  serviceName: string
  durationMins: number
  assigned_tech_id: string | null
}

export function buildEventBody(job: JobForEvent, options: { calendarId: string }): { summary: string; description: string; location: string; start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string } } {
  const start = new Date(job.scheduled_at)
  const end = new Date(start.getTime() + job.durationMins * 60 * 1000)
  const timeZone = 'UTC'
  const summary = `${job.serviceName} – ${job.clientName}${job.vehicleSummary ? ` (${job.vehicleSummary})` : ''}`
  const description = [
    job.serviceName,
    job.notes || '',
    `Job #${job.id}`,
  ].filter(Boolean).join('\n')

  return {
    summary,
    description,
    location: job.address,
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
  }
}

/** List events in a calendar between timeMin and timeMax (ISO strings). */
export async function listEvents(
  encryptedTokens: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<{ id: string; summary: string; start: string; end: string }[]> {
  const accessToken = await getValidAccessToken(encryptedTokens)
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return []
  const data = (await res.json()) as {
    items?: { id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }[]
  }
  const items = data.items ?? []
  return items
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      id: e.id,
      summary: e.summary ?? '(No title)',
      start: e.start!.dateTime!,
      end: e.end!.dateTime!,
    }))
}

export async function createEvent(encryptedTokens: string, calendarId: string, job: JobForEvent): Promise<string> {
  const accessToken = await getValidAccessToken(encryptedTokens)
  const body = buildEventBody(job, { calendarId })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create event failed: ${err}`)
  }
  const data = (await res.json()) as { id: string }
  return data.id
}

export async function updateEvent(encryptedTokens: string, calendarId: string, eventId: string, job: JobForEvent): Promise<void> {
  const accessToken = await getValidAccessToken(encryptedTokens)
  const body = buildEventBody(job, { calendarId })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Update event failed')
}

/** Update start/end and optionally summary of an event. start/end are RFC3339 ISO strings. */
export async function updateEventTimes(
  encryptedTokens: string,
  calendarId: string,
  eventId: string,
  start: string,
  end: string,
  summary?: string
): Promise<void> {
  const accessToken = await getValidAccessToken(encryptedTokens)
  const body: { start: { dateTime: string }; end: { dateTime: string }; summary?: string } = {
    start: { dateTime: start },
    end: { dateTime: end },
  }
  if (summary !== undefined && summary !== null) body.summary = summary
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Update event failed: ${err}`)
  }
}

export async function deleteEvent(encryptedTokens: string, calendarId: string, eventId: string): Promise<void> {
  const accessToken = await getValidAccessToken(encryptedTokens)
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 404) throw new Error('Delete event failed')
}
