# Automations cron (reviews, reminders, maintenance)

The **same** cron endpoint runs all three: review follow-up, job reminders, and maintenance upsell. There is no separate “blog” or “job” cron.

- **Endpoint:** `GET /api/cron/automations`
- **Auth:** `Authorization: Bearer YOUR_CRON_SECRET` or header `x-cron-secret: YOUR_CRON_SECRET`
- **Suggested schedule:** Every **15–30 minutes** (see below)

---

## What it does

1. **Review follow-up** – Jobs marked done X days ago (org setting), no review sent yet → send review request email (with review URL).
2. **Job reminders** – Jobs whose **scheduled time is in the next N minutes** (org “Minutes before”) → send reminder email to the client.
3. **Maintenance upsell** – Jobs done N days ago (per org maintenance days) → send “time for your next detail?” email with booking link.

---

## Why didn’t my 8am job reminder send?

Job reminders are sent only when the cron runs **while the job’s scheduled time is inside the “reminder window”**: from “now” to “now + minutes before”.

- Example: job at **8:00**, “Minutes before” = **60**.
  - Cron at **7:00** → window 7:00–8:00 → 8:00 is in window → reminder sent.
  - Cron at **7:30** → window 7:30–8:30 → 8:00 is in window → reminder sent.
  - Cron at **8:00** → window 8:00–9:00 → 8:00 is in window → reminder sent.
  - Cron at **8:05** → window 8:05–9:05 → 8:00 is **before** window → **no reminder**.

So if your cron runs only **once at 8am**, an 8am job can be missed (e.g. cron runs at 8:02). **Run the automations cron at least every 15–30 minutes** so there is always a run that falls inside the reminder window (e.g. 7:00, 7:15, 7:30, 7:45 for a 60‑minute window before 8am).

Other checks:

- **Settings → Notifications → Job reminders**
  - “Client → Email” must be **on** (the cron only sends email for reminders; it uses `job_reminder_client_email_on`).
  - “Minutes before” is the window (e.g. 60 = reminders for jobs in the next 60 minutes).
- **Job**
  - Status must be **Scheduled** or **En route** (not Completed/Done/Cancelled).
  - **Reminder sent** must not already be set (cron only sends once per job).
- **Client**
  - Must have an **email**; otherwise the cron skips sending and just marks the job as “reminder sent” so it doesn’t retry.

---

## Cron setup (cron-jobs.org or similar)

- **URL:** `https://your-app-url.com/api/cron/automations`
- **Method:** GET
- **Headers:** `Authorization: Bearer YOUR_CRON_SECRET` (or `x-cron-secret: YOUR_CRON_SECRET`)
- **Schedule:** Every **15** or **30** minutes (so job reminders are sent in time)

The “blog” in the app is only a static page redirect (`/blog` → `/blog.html`); no cron is used for it. All time-based automations (reviews, reminders, maintenance) use this single **automations** endpoint.
