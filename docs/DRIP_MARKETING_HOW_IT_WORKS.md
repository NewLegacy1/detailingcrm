# How Drip Marketing Actually Works (Low-Level)

For someone who wants to know: how does this shit differentiate companies, where does the message go, and how does it actually send.

---

## 1. The three tables (what lives in the DB)

```
drip_campaigns     →  one row per “automation” per company (org)
drip_runs          →  one row per “execution” of that automation for one person/context
tracking_links     →  one row per tracked URL (for {{trackedBookingUrl}} and link_opened)
```

- **Company separation**: Every row that matters is tied to `org_id`. Campaigns have `org_id`, runs have `org_id`. RLS (row level security) enforces `org_id = get_user_org_id()` so company A never sees or touches company B’s data.
- **Who gets the message**: Each **run** is for one “context”: a specific customer and/or job and/or booking session. Phone/email are resolved from that context (see below).

---

## 2. How companies are kept separate (multi-tenant)

- **drip_campaigns**: `org_id uuid not null`. Every campaign belongs to one organization. API and UI only ever see campaigns for the current user’s org (via Supabase auth + RLS).
- **drip_runs**: `org_id uuid not null` + `campaign_id` → campaign. So a run is “this org’s campaign, this run’s context.” Cron and app only work with runs the service role can read; in practice you’d scope by org when you add more tooling.
- **RLS**: Policies on both tables use `org_id = public.get_user_org_id()`. So:
  - Company A’s user → `get_user_org_id()` = A’s org → only A’s campaigns and runs.
  - Company B’s user → only B’s.

No “company ID” is passed around in the drip logic itself; it’s already baked into which rows exist and which rows RLS allows. When we “run for a campaign,” the campaign’s `org_id` (and the run’s `org_id`) *is* the company.

---

## 3. End-to-end flow (two halves)

### Part A: Starting a run (when does a drip “start”)

Conceptually: “Event X happened for org Y and context Z → start a drip run for that org’s campaign(s) that listen for X.”

- **Intended entry point**: `startDripRunsForTrigger(triggerType, context)` in `src/lib/drip-server.ts`.
- **Arguments**:
  - `triggerType`: e.g. `'abandoned_booking'`, `'job_paid'`, `'new_booking'`, `'job_completed'`, `'appointment_reminder'`.
  - `context`: `{ org_id, customer_id?, job_id?, booking_session_id? }`. This is the company + the person/session this run is for.

What it does (low-level):

1. Query **drip_campaigns**:
   - `org_id = context.org_id`
   - `trigger_type = triggerType`
   - `active = true`
2. For each matching campaign, **insert** one row into **drip_runs**:
   - `campaign_id`, `org_id`, `customer_id`, `job_id`, `booking_session_id` from context
   - `current_step` = first node after the trigger (from that campaign’s `workflow_json`)
   - `status = 'running'`, `variables = {}`, `next_step_at = null` (so cron will pick it up immediately)

So: **one run = one company’s campaign + one customer/booking context.** Different companies = different `org_id` = different campaigns and different runs. No cross-company mixing.

**Where you’d call it (not all wired yet):**

- **abandoned_booking**: Cron or job that finds “sessions that started but didn’t book” for an org → for each, call `startDripRunsForTrigger('abandoned_booking', { org_id, booking_session_id, customer_id? })`.
- **job_paid**: When a job is marked paid (e.g. in job-detail or webhook) → `startDripRunsForTrigger('job_paid', { org_id, customer_id, job_id })`.
- **new_booking**: When a new booking is created → same idea with `job_id` / `booking_session_id` as needed.
- **job_completed** / **appointment_reminder**: Same pattern from whatever code handles “job done” or “reminder due.”

So “how does it differentiate companies?” → The **caller** passes `org_id` (and the rest of the context). Only that org’s campaigns match; only runs for that org are created.

---

## 4. Part B: Advancing the run (cron = the “engine”)

Runs don’t run themselves. A **cron job** hits `GET /api/cron/drip` (with `CRON_SECRET`). That route:

1. **Select** from **drip_runs**:
   - `status = 'running'`
   - `next_step_at IS NULL OR next_step_at <= now()`
   - limit 50
2. For each run:
   - Load **drip_campaigns** row for `run.campaign_id` (get `workflow_json`).
   - Look up the node where `node.id === run.current_step`.
   - **Switch on node type** and do one thing, then update the run (and maybe `variables`).

So the “interpreter” is: one step per run per cron tick. The workflow is just a graph (nodes + edges); the run’s `current_step` is a node id; `next_step_at` is when to run the next node (for `wait` nodes).

---

## 5. How “who gets the message” is determined (SMS / email)

Each **run** has:

- `org_id`
- `customer_id` (optional)
- `job_id` (optional)
- `booking_session_id` (optional)

When the current node is **sms** or **email**:

- **Phone (SMS)**: `resolvePhone(supabase, run)`  
  - If `run.customer_id` → get `clients.phone` for that client.  
  - Else if `run.booking_session_id` → get `booking_sessions.phone`.  
  - Else → no phone; cron logs and moves on (no send).
- **Email**: `resolveEmail(supabase, run)`  
  - Same idea: `clients.email` or `booking_sessions.email` from that run’s context.

So the **company** is already fixed by `org_id` on the run (and campaign). The **recipient** is fixed by the run’s `customer_id` / `booking_session_id`. Different companies never share a run; each run has one recipient (or none if missing phone/email).

---

## 6. How the message is actually sent

- **SMS**: In the cron, when the node is `sms`, it:
  - Reads `node.data.body` (template string with `{{customerName}}`, `{{trackedBookingUrl}}`, etc.).
  - Fills variables (see below).
  - Calls `sendSms(phone, body)` from `@/lib/notifications` → that uses **Twilio** (env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`). One API call = one SMS to that phone.
- **Email**: When the node is `email`, the body is wrapped in a branded HTML template (`buildDripEmailHtml`) so drip emails look consistent with other automation emails; then `sendEmail(email, subject, textBody, html, ...)` from `@/lib/notifications` → **Resend**. One call = one email.

So: **one run, one current step, one recipient (phone or email), one external API call.** No batching; it’s per-run, per-step.

---

## 7. Variables and tracking ({{customerName}}, {{trackedBookingUrl}}, etc.)

- **Variables** live on the run: `drip_runs.variables` (jsonb). Things like `customerName`, `customerEmail`, `trackedBookingUrl`, `businessName`, `trackedLinkId` are written there when we resolve them (from `clients` / `booking_sessions` / `organizations`) or when we create a tracking link.
- **Replacement**: Before sending, the cron does a simple string replace: for each `{{key}}` in the template, replace with `variables[key]`. So `Hi {{customerName}}, book here: {{trackedBookingUrl}}` becomes the actual name and URL.
- **Tracked links**: If the SMS (or email) body contains `{{trackedBookingUrl}}`, the cron:
  - Inserts a row into **tracking_links**: `run_id`, random `token`, `target_url` (e.g. `/book/{slug}`).
  - Puts `https://your-domain/r/{token}` into `variables.trackedBookingUrl`.
  - When the user hits `/r/[token]`, the app looks up the token, sets `tracking_links.visited_at`, then redirects to `target_url`. So “link opened” can be used in **check** nodes (`link_opened`).

---

## 8. Summary diagram (data + flow)

```
[ Event in your app: e.g. “booking abandoned” for org X, session S ]
        │
        ▼
startDripRunsForTrigger('abandoned_booking', { org_id: X, booking_session_id: S })
        │
        ▼
SELECT drip_campaigns WHERE org_id = X AND trigger_type = '...' AND active
        │
        ▼
INSERT drip_runs (campaign_id, org_id, booking_session_id, current_step = first node, next_step_at = null)
        │
        ▼
[ Cron: GET /api/cron/drip every N minutes ]
        │
        ▼
SELECT drip_runs WHERE status='running' AND (next_step_at IS NULL OR next_step_at <= now())
        │
        ▼
For each run: load campaign.workflow_json → get node run.current_step
        │
        ├─ trigger → advance current_step to next node
        ├─ wait    → set next_step_at = now + duration, advance to next node
        ├─ sms     → resolvePhone(run), replace {{vars}}, sendSms(phone, body), advance
        ├─ email   → resolveEmail(run), replace {{vars}}, sendEmail(...), advance
        ├─ check   → evaluate condition (e.g. booking_completed, link_opened), follow true/false edge, advance
        └─ end     → set status = 'completed'
        │
        ▼
UPDATE drip_runs SET current_step, next_step_at, variables, status
```

**How it differentiates companies:** `org_id` on campaigns and runs; RLS and all queries scope by org; the caller of `startDripRunsForTrigger` passes `org_id`.

**How it sends:** One run = one execution path. When the current step is sms/email, we resolve one phone or email from that run’s context and call Twilio or Resend once.

**How “this shit” works:** Campaign = graph (nodes/edges) stored as JSON. Run = pointer (`current_step`) + schedule (`next_step_at`). Cron walks the graph one step per run per tick and does I/O (DB updates, SMS/email) per node type.

---

## 9. Testing a workflow (send yourself a message)

**`startDripRunsForTrigger` is not wired yet** — nothing in the app automatically creates runs (e.g. abandoned booking). To test that a workflow actually sends, use one of these.

### Option A: API (easiest)

1. Create or pick a **client** in your org that has **your email** (for email) or **your phone** (for SMS). The message is sent to that client.
2. In Drip Marketing, create a campaign from a template (or your own) and **Save**.
3. Call the test-run API (while logged in, or with a session cookie):

   `POST /api/drip/test-run`  
   Body: `{ "client_id": "<that client's uuid>" }`  
   Optional: `"campaign_id": "<campaign uuid>"` to use a specific campaign; otherwise the first active one is used.

4. Trigger the drip cron once (hit `GET /api/cron/drip` with your cron secret, or wait for the next scheduled run). The run will be processed and the first **SMS or email** step will send to that client.

So: create run via API → run cron (or wait) → you get the message. For **email**, your campaign must have at least one **Email** node (the default “Abandoned Booking” template is SMS-only; add an Email node in the builder if you want to test email).

### Option B: SQL (Supabase SQL editor)

Run once after replacing the placeholders. Use a **client** that has your email/phone.

```sql
-- Replace these (get IDs from Supabase: drip_campaigns.id, clients.id for a client with your email/phone)
-- current_step: use 'sms1' for the default template's first SMS, or the id of your first email node to test email
INSERT INTO drip_runs (
  campaign_id,
  org_id,
  customer_id,
  job_id,
  booking_session_id,
  current_step,
  status,
  variables,
  next_step_at
) VALUES (
  '<campaign_uuid>',
  '<org_uuid>',
  '<client_uuid>',
  NULL,
  NULL,
  'sms1',   -- or your first email node id to test email
  'running',
  '{}',
  NULL
);
```

Then trigger the cron (or wait). The next tick will send the message for that step.

---

## 10. Cron setup (cron-jobs.org or similar)

You have two separate crons; both use the same `CRON_SECRET`:

| Purpose | URL | Method | Auth | Schedule |
|--------|-----|--------|------|----------|
| **Automations** (reviews, reminders, maintenance) | `.../api/cron/automations` | GET | `Authorization: Bearer YOUR_CRON_SECRET` | e.g. every 15 min (what you already have) |
| **Drip** (advance drip runs: wait → sms → email → check → end) | `.../api/cron/drip` | GET | Same Bearer token | Every 5–15 min (e.g. every 10 min) |

- **Add a second cron job** for drip: URL = `https://detailops.vercel.app/api/cron/drip`, same `Authorization: Bearer <CRON_SECRET>` as automations, GET, every 10 or 15 minutes. Leave the existing automations job as-is.
- If you later add an “abandoned booking detector,” it can live inside `/api/cron/drip` so you still only have these two jobs.

---

## 11. Production hardening (quick path to 9.5+)

- **Error/retry**: On Twilio/Resend failure, persist a `failed`/`retrying` state and log; consider retries + dead-letter.
- **Concurrency**: Use `SELECT ... FOR UPDATE SKIP LOCKED` (and optionally a `processing_at` lock) in the cron so multiple cron instances don’t double-process the same run.
- **Observability**: Add a `drip_run_events` (or similar) table: step, timestamp, success/fail, error message — so “I never got the 4-day follow-up” is debuggable.
- **Triggers**: Wire at least one full trigger (e.g. abandoned-booking detector that calls `startDripRunsForTrigger('abandoned_booking', ...)`).
- **Manual test**: Optional “advance this run one step” button in the UI for debugging.
