# Bookings from /book/showroom-autocare (or any slug) not showing in CRM

If jobs booked on the public page (e.g. `detailops.vercel.app/book/showroom-autocare`) don’t appear in Jobs, Dashboard, or Schedule for that business, work through this checklist.

---

## 1. Confirm the job was created

- **“Book now” (no deposit):** The job is created by `POST /api/booking`. If the customer saw a success screen, the job should exist.
- **Deposit or “card on file”:** The job is created only when:
  - Stripe sends `checkout.session.completed` to your **webhook** (`/api/stripe/webhook`), or
  - The customer lands on the success page and the app calls **`/api/booking/complete-session`** (fallback).

**Check in Supabase:**

- Table **`jobs`**: Look for a row with `created_at` near the time of the booking. Note its `org_id`.
- If you used **deposit/card**, also check **`pending_bookings`**: a row with `status = 'pending'` and recent `created_at` means the webhook/fallback didn’t run yet (or failed).

---

## 2. Confirm the job’s org matches the business

- In **`organizations`**, find the row for Showroom Autocare and note its **`id`**.
- Confirm that row has **`booking_slug`** = `showroom-autocare` (no typos, lowercase).
- In **`jobs`**, the new job’s **`org_id`** must equal that organization **`id`**.  
  If `org_id` is different or null, the booking API looked up the wrong org (e.g. wrong slug sent) or something overwrote it.

---

## 3. Confirm the CRM user’s org matches

The CRM only shows jobs for the **logged-in user’s organization**.

- In **`profiles`**, find the row where **`id`** = the CRM user’s auth id (the person who doesn’t see the job).
- That row’s **`org_id`** must equal the **same** organization id as in step 2 (Showroom Autocare’s org id).

**If `profiles.org_id` is wrong or null:**

- Fix it in Supabase (or via your app if you have an admin UI):

  ```sql
  -- Replace YOUR_USER_AUTH_ID and SHOWROOM_ORG_ID with real UUIDs from auth.users and organizations.
  UPDATE public.profiles
  SET org_id = 'SHOWROOM_ORG_ID'
  WHERE id = 'YOUR_USER_AUTH_ID';
  ```

- After that, the user should see all jobs for that org (including the new booking) in Jobs, Dashboard, and Schedule.

---

## 4. Check Vercel logs (after the next booking)

After deploying the latest code, when someone books:

- You should see log lines like:  
  `[Booking] slug=showroom-autocare org_id=<uuid>`  
  and  
  `[Booking] Created job_id=<uuid> org_id=<uuid> slug=showroom-autocare`
- If you see `[Booking] Org lookup failed` or `[Booking] Job insert failed`, the logs will include the error reason.

---

## 5. Quick reference: where org_id comes from

| Place              | Source of org_id |
|--------------------|-------------------|
| New job (booking)  | `organizations.id` where `booking_slug` = request slug (e.g. `showroom-autocare`) |
| Who sees it in CRM | `profiles.org_id` for the logged-in user must equal that same `organizations.id` |

If the job exists in `jobs` with the correct `org_id` but the CRM user still doesn’t see it, their **`profiles.org_id`** is almost certainly wrong or null; fix it as in step 3.
