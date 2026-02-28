# Google Calendar Integration — Analysis & Plan

## Step 0 — Codebase analysis

| Area | Finding |
|------|--------|
| **Stack** | Next.js 16 App Router, Supabase (auth + Postgres), no separate API server |
| **Routing** | App Router under `(main)`; Settings at `/settings`, Integrations at `/settings/integrations` |
| **Auth** | Supabase Auth; `profiles` (id, role, org_id, …); no separate employees table — `assigned_tech_id` on jobs = profile id |
| **Org** | `organizations` table (id, name, stripe_account_id, stripe_email, + invoice/settings columns) |
| **Job** | `jobs` (id, customer_id, vehicle_id, service_id, scheduled_at, address, assigned_tech_id, status, notes, created_at, updated_at) |
| **Job create** | Client: `new-job-form.tsx` → `supabase.from('jobs').insert()` then redirect to job detail |
| **Job update** | Client: `job-detail-client.tsx` → `supabase.from('jobs').update()` for status and notes |
| **Settings/Integrations** | `/settings/integrations` page: Stripe card only; layout has sidebar nav |
| **RBAC** | `lib/permissions.ts` + `lib/permissions-server.ts`; `requirePermission()` in API routes; role_permissions table |
| **Queue** | None; will use in-process fire-and-forget sync API call from client after job create/update |
| **Encryption** | None; add server-only encrypt/decrypt using TOKEN_ENCRYPTION_SECRET |

---

## Files to ADD

| File | Purpose |
|------|--------|
| `supabase/migrations/008_google_calendar.sql` | Org google fields; job google fields; optional profile fields; calendar_sync_queue; new permissions for owner/admin |
| `src/lib/token-encryption.ts` | Server-only encrypt/decrypt for tokens (AES-256-GCM) |
| `src/lib/google-calendar.ts` | Server-only: OAuth URL, exchange code, refresh, list calendars, create calendar, create/update/delete event |
| `src/app/api/integrations/google/status/route.ts` | GET status (connected, calendarId, options) |
| `src/app/api/integrations/google/connect/route.ts` | POST — return auth URL (state in cookie/session) |
| `src/app/api/integrations/google/callback/route.ts` | GET — OAuth callback, store tokens, redirect |
| `src/app/api/integrations/google/disconnect/route.ts` | POST — clear tokens |
| `src/app/api/integrations/google/calendars/route.ts` | GET list, POST create "Detailing Jobs" |
| `src/app/api/integrations/google/sync/retry/route.ts` | POST { jobId } — retry sync for one job |
| `src/app/api/integrations/google/sync/job/[id]/route.ts` | POST — run sync for job (create/update/delete events); called fire-and-forget |
| `src/components/settings/google-calendar-card.tsx` | Connection status, sync options, connect/disconnect |
| `src/components/jobs/google-sync-badge.tsx` | Badge (Synced / Failed / Pending) + Retry button |

---

## Files to CHANGE (minimal)

| File | Change |
|------|--------|
| `src/types/database.ts` | Add Organization google fields; Job google fields; optional Profile google fields |
| `src/lib/permissions.ts` | Add INTEGRATIONS_VIEW, INTEGRATIONS_MANAGE, GOOGLE_CONNECT, GOOGLE_DISCONNECT, GOOGLE_SYNC_RETRY; add to default owner/admin |
| `src/app/(main)/settings/integrations/page.tsx` | Render Google Calendar card below Stripe |
| `src/app/(main)/jobs/[id]/page.tsx` | Select job google_* columns; pass to client |
| `src/app/(main)/jobs/[id]/job-detail-client.tsx` | Add GoogleSyncBadge; after updateStatus/saveNotes call sync API (fire-and-forget) |
| `src/app/(main)/jobs/new/new-job-form.tsx` | After successful insert, call sync API (fire-and-forget) |

---

## Data model (additive)

- **organizations:** google_company_calendar_id, google_tokens_encrypted, google_token_meta (json), google_sync_to_company (bool default true), google_sync_to_employee (bool default false), google_move_on_reassign (bool default true)
- **jobs:** google_company_event_id, google_assigned_employee_event_id, google_sync_status (text default 'pending'), google_last_synced_at, google_last_sync_error
- **profiles:** (optional) google_calendar_id, google_tokens_encrypted, google_sync_enabled — only if we do employee calendar sync; can add in migration for future
- **calendar_sync_queue:** (optional) for retries; we can skip and use “retry” API that runs sync inline

---

## Sync flow

- **Job create:** Client inserts job → redirect; client then `fetch(POST /api/integrations/google/sync/job/[id])` without await.
- **Job update (time, address, status, notes, assigned_tech_id):** Client updates job → then same fetch to sync job (fire-and-forget).
- **Sync job API:** Load job + org; if org not connected or sync disabled → 200 no-op. Else: create or patch company calendar event (using job.google_company_event_id); if employee sync enabled and assigned_tech_id set, create/patch/delete employee event. On failure set job.google_sync_status = 'failed', google_last_sync_error; never throw to client.
- **Retry:** POST /api/integrations/google/sync/retry with jobId → same as sync job (idempotent).

---

## Env vars

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- NEXT_PUBLIC_APP_URL or VERCEL_URL for redirect_uri
- TOKEN_ENCRYPTION_SECRET (32 bytes hex or base64 for AES-256)
