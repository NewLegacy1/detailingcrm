# Stripe setup for DetailOps subscription checkout

This guide walks through **exactly** what to do in the Stripe Dashboard so the onboarding paywall and post-payment flow work.

---

## 1. Get your API keys

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and sign in.
2. **Toggle “Test mode”** (top right) **ON** while building; use **OFF** for live payments.
3. In the left sidebar, open **Developers → API keys**.
4. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (click “Reveal”, starts with `sk_test_` or `sk_live_`) → `STRIPE_SECRET_KEY`

Add to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
```

---

## 2. Create products and recurring prices (CAD)

The app expects **two subscription plans**: **Starter** ($75 CAD/mo) and **Pro** ($100 CAD/mo). You create one Product per plan and one recurring Price per product.

### 2.1 Create the Starter product and price

1. In the left sidebar go to **Product catalog** (or **Products**).
2. Click **+ Add product**.
3. **Product information**
   - **Name:** `DetailOps Starter`
   - **Description:** (optional) e.g. `Solo detailer plan — CRM, booking, jobs, invoices.`
   - **Image:** (optional)
4. Under **Pricing**, choose **Standard pricing**.
5. **Price**
   - **Pricing model:** Recurring.
   - **Price:** `75.00`.
   - **Currency:** **CAD** (not USD).
   - **Billing period:** Monthly.
   - **Free trial:** leave empty unless you want one.
6. Click **Save product**.
7. On the product page, open the **Pricing** section. You’ll see a price with an ID like `price_xxxxxxxxxxxx`. **Copy that Price ID** — this is `STARTER_PRICE_ID` (or `STRIPE_PRICE_ID_STARTER`).

### 2.2 Create the Pro product and price

1. Click **+ Add product** again.
2. **Product information**
   - **Name:** `DetailOps Pro`
   - **Description:** (optional) e.g. `Growth plan — branding, integrations, automation.`
3. Under **Pricing**, **Standard pricing**, add a **Price**:
   - **Pricing model:** Recurring.
   - **Price:** `100.00`.
   - **Currency:** **CAD**.
   - **Billing period:** Monthly.
4. Click **Save product**.
5. Copy the new **Price ID** (e.g. `price_yyyyyyyyyyyy`) — this is `PRO_PRICE_ID` (or `STRIPE_PRICE_ID_PRO`).

### 2.3 Add the Price IDs to `.env.local`

```env
STARTER_PRICE_ID=price_xxxxxxxxxxxx
PRO_PRICE_ID=price_yyyyyyyyyyyy
```

The app uses `STARTER_PRICE_ID` / `PRO_PRICE_ID` (and falls back to `STRIPE_PRICE_ID_STARTER` / `STRIPE_PRICE_ID_PRO` if you prefer those names).

---

## 3. Create the webhook endpoint (so payment completes → dashboard access)

When a customer finishes checkout, Stripe sends a `checkout.session.completed` event to your app. Your app then updates the organization’s subscription so the user can access the CRM. For that, Stripe must call a **webhook URL** and you must give Stripe a **signing secret**.

### 3.1 Webhook URL

- **Production:** `https://YOUR_DOMAIN/api/stripe/webhook`  
  Example: `https://detailops.vercel.app/api/stripe/webhook`
- **Local testing:** use Stripe CLI (see section 4); the CLI gives you a temporary URL and signing secret.

### 3.2 Add the endpoint in the Stripe Dashboard

1. In the left sidebar go to **Developers → Webhooks**.
2. Click **+ Add endpoint**.
3. **Endpoint URL:**  
   Enter your production URL, e.g. `https://your-app.vercel.app/api/stripe/webhook`.
4. **Description:** (optional) e.g. `DetailOps subscription — activate org after checkout`.
5. **Events to send:**  
   Click **Select events** and choose:
   - **checkout.session.completed**
6. Click **Add endpoint**.
7. On the new endpoint’s page, open **Signing secret** and click **Reveal**. Copy the value (starts with `whsec_`).

### 3.3 Add the signing secret to env

Add to `.env.local` (and to your hosting provider’s env, e.g. Vercel):

```env
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

**You must paste the real value from Stripe** (Reveal the signing secret on the webhook endpoint page). The app cannot verify webhooks without it.

---

## 3.4 Vercel: add all Stripe (and app URL) env vars

For production at `detailops.vercel.app`, add these in **Vercel → your project → Settings → Environment Variables** (same values as in `.env.local` where applicable):

| Variable | Required | Notes |
|----------|----------|--------|
| `STRIPE_SECRET_KEY` | Yes | Secret key from Stripe (live or test) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Publishable key |
| `STARTER_PRICE_ID` | Yes | So checkout can create Starter sessions |
| `PRO_PRICE_ID` | Yes | So checkout can create Pro sessions |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | Yes | Signing secret from the webhook endpoint (Reveal in Stripe) |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://detailops.vercel.app` so success/cancel redirects work |

**Yes, you need to add the price IDs to Vercel** — the server runs on Vercel and reads env at runtime, so without them production checkout won’t have the correct prices. Add every Stripe-related variable above so production and local behave the same.

**Important:** Use the **same** Stripe mode (test vs live) as your API keys. In Test mode the webhook secret starts with `whsec_` and is for test events; for Live you create a separate endpoint and use its secret.

---

## 4. (Optional) Test the webhook locally with Stripe CLI

So you can trigger test events against your machine:

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli).
2. Log in: `stripe login`.
3. Forward events to your local app (e.g. port 3000):

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. The CLI prints a **webhook signing secret** (e.g. `whsec_...`). Use **this** value for `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` in `.env.local` while the CLI is running — not the Dashboard secret.
5. Run your app (`npm run dev`), then in another terminal trigger a test checkout completion:

   ```bash
   stripe trigger checkout.session.completed
   ```

   Check your app logs to confirm the webhook ran and the org was updated (you may need to adjust the test payload so it includes `metadata.userId` / `client_reference_id` if your handler expects it).

---

## 5. App URL for redirects

Checkout uses a success/cancel URL. Set your app’s base URL so redirects go to the right place:

- **Production:** set `NEXT_PUBLIC_APP_URL` (e.g. `https://detailops.vercel.app`) in your hosting env.
- **Local:** the app falls back to `http://localhost:3000` when `NEXT_PUBLIC_APP_URL` and `VERCEL_URL` are not set.

---

## 6. Checklist summary

| Step | Where | What |
|------|--------|------|
| API keys | Developers → API keys | Copy secret + publishable → `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Starter price | Product catalog | Create product “DetailOps Starter”, recurring $75 CAD/mo → copy Price ID → `STARTER_PRICE_ID` |
| Pro price | Product catalog | Create product “DetailOps Pro”, recurring $100 CAD/mo → copy Price ID → `PRO_PRICE_ID` |
| Webhook | Developers → Webhooks | Add endpoint `https://YOUR_DOMAIN/api/stripe/webhook`, event `checkout.session.completed` → copy Signing secret → `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` |
| App URL | Hosting env | Set `NEXT_PUBLIC_APP_URL` to your production URL |

---

## 7. What the app does with Stripe

- **Checkout:** When a logged-in user picks Starter or Pro on `/onboarding`, the app creates a Stripe Checkout Session (using the Price ID for that plan), with `client_reference_id` and `metadata.userId` set to the Supabase user ID.
- **Success redirect:** Stripe sends the user to `/onboarding/setup?plan=starter` or `?plan=pro`.
- **Webhook:** When Stripe sends `checkout.session.completed`, the app reads the user ID from the session, finds their organization, and sets `subscription_plan`, `subscription_status: 'active'`, and optionally `stripe_customer_id` / `stripe_subscription_id`.
- **Dashboard:** The CRM layout only allows access when the org has an active plan; the setup page polls until the webhook has run, then redirects to `/crm/dashboard`.

If anything in this guide doesn’t match what you see in the Stripe Dashboard (e.g. menu names), refer to Stripe’s docs; the concepts (Products, Prices, Webhooks, Signing secret) are the same.
