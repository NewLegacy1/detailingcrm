# Settings + Stripe Connect + RBAC — Implementation Plan

**Status:** Plan only (no code changes until approved).  
**Goal:** Add Settings home, Payments & Invoicing (Stripe Connect), and Team & Roles (RBAC) without breaking existing behavior.

---

## Step 0 — Analysis Summary

| Area | Finding |
|------|--------|
| **Routing** | Next.js 16 App Router. Main app under `(main)` layout; `/settings` exists with two tabs (Profile, Integrations). |
| **Auth** | Supabase Auth; `profiles` table (id, role, display_name, business_name, avatar_url). No orgs table. |
| **Users/Orgs** | Single-tenant: no `organizations` or `employees` table. Team = list of `profiles`; role stored as `profiles.role` enum (`pending` \| `owner` \| `admin` \| `technician`). |
| **Settings** | `/settings` = `page.tsx` + `SettingsTabs` (Profile form, Integrations tab with disabled “Connect Stripe” button). No dedicated settings table. |
| **Payments/Invoices** | Invoices in `invoices` table; `GET /api/invoices/stripe`, `POST /api/invoices/send`; `STRIPE_SECRET_KEY` only; no Stripe Connect, no `stripe_account_id`. |
| **UI** | Tailwind v4, CSS vars in `globals.css`, custom components in `src/components/ui/` (Button, Input, Label, Dialog, Table, Textarea). |
| **Permissions** | Role-based nav (`getNavItemsForRole`); invoice API checks `role === 'owner' \|\| role === 'admin'`; RLS uses `get_user_role()` in DB. No granular permissions. |

---

## 1) Routing & Layout Plan

- **Keep** existing `/settings` **route** but change its content to **Settings Home** (categories, Stripe card, “Most used”, “All settings”).
- **Add** nested routes under a shared **settings layout**:
  - `/settings` → Settings Home (new content).
  - `/settings/profile` → Current Profile + Logo (existing `ProfileForm`); move from tab to route.
  - `/settings/integrations` → Current Integrations tab content (Stripe card); later can redirect or merge into Payments.
  - `/settings/payments` → **New** Payments & Invoicing page (Stripe Connect + invoice defaults + taxes/fees + payment methods).
  - `/settings/team` → **New** Team & Roles page (employee list, add/edit, role editor, permissions).
- **Add** `src/app/(main)/settings/layout.tsx` — responsive: desktop = sidebar nav for settings categories; mobile = stacked + back/breadcrumb. Reuse existing `.card`, `Button`, etc.
- **Do not** remove or rename `/login`, `/signup`, `/dashboard`, `/team`, `/invoices`, or any existing API route.

---

## 2) Database Changes (Additive, Backwards Compatible)

**New migration file:** `supabase/migrations/006_settings_stripe_rbac.sql` (or split into 006/007 if preferred).

### 2.1 Organizations (for Stripe Connect and future multi-tenant)

- **New table:** `organizations`  
  - `id` uuid PK default gen_random_uuid()  
  - `name` text  
  - `stripe_account_id` text (Connect Express account id)  
  - `stripe_email` text (for display)  
  - `created_at`, `updated_at` timestamptz  
- **New column:** `profiles.org_id` uuid references `organizations(id)` nullable.  
- **Backfill:** Insert one default org; set all existing profiles’ `org_id` to that org (or leave null and resolve in app: “current org” = default org when null).

### 2.2 Stripe Connect (no change to existing `invoices` columns)

- Storage for Connect: `organizations.stripe_account_id` (and optional `stripe_email`).  
- **No** removal or rename of `invoices.stripe_invoice_id` / `invoices.stripe_customer_id`.

### 2.3 RBAC (Option A: roles + role_permissions + keep profiles.role)

- **New table:** `roles`  
  - `id` uuid PK  
  - `name` text (e.g. "Owner", "Admin", "Manager", "Tech")  
  - `key` text unique (e.g. 'owner', 'admin', 'manager', 'tech')  
  - `created_at`, `updated_at`  
- **New table:** `role_permissions`  
  - `role_id` uuid FK to `roles`  
  - `permission` text (e.g. 'settings.view', 'invoices.send')  
  - PK (role_id, permission)  
- **Optional new column:** `profiles.role_id` uuid FK to `roles` nullable.  
- **Backfill:** Insert 4 rows into `roles` (owner, admin, manager, tech); insert all required permissions for each; set `profiles.role_id` from current `profiles.role` (map pending → owner for “safe default”). Keep `profiles.role` column for backward compatibility (read from role key when role_id set).  
- **RLS:** Existing policies use `get_user_role()`; extend to support role_id (e.g. resolve role key from roles table when role_id is set). No destructive policy drops in this step.

### 2.4 Invoice defaults (optional for Phase 1)

- **New table:** `organization_settings` or new columns on `organizations`: e.g. `invoice_due_days_default`, `invoice_memo_default`, `invoice_footer_default`, `invoice_number_prefix`, `invoice_tips_enabled`, `tax_enabled`, `tax_rate`, `travel_fee_enabled`, `travel_fee_amount`, `fee_handling` (enum), `payment_methods` (jsonb or separate table).  
- Prefer additive columns on `organizations` or one JSONB `settings` column to avoid many migrations; can be added in same or follow-up migration.

---

## 3) New Files to Add

| File | Purpose |
|------|--------|
| `src/app/(main)/settings/layout.tsx` | Settings layout: sidebar (desktop) + breadcrumb/back (mobile); nav links to /settings, /settings/profile, /settings/payments, /settings/team, /settings/integrations. |
| `src/app/(main)/settings/page.tsx` | **Replace** content with Settings Home: header (business name + plan), Stripe status card, “Most used” links, “All settings” category list. |
| `src/app/(main)/settings/profile/page.tsx` | Server component: load profile; render existing `ProfileForm` (move from tab). |
| `src/app/(main)/settings/integrations/page.tsx` | Render existing `IntegrationsTab` (or redirect to /settings/payments). |
| `src/app/(main)/settings/payments/page.tsx` | Payments & Invoicing: Stripe block + invoice defaults + taxes/fees + payment method toggles (sections as per spec). |
| `src/app/(main)/settings/team/page.tsx` | Team & Roles: list employees (profiles), add/edit employee, role editor, permissions checklist; Owner cannot be demoted by non-owner. |
| `src/components/settings/settings-nav.tsx` | Reusable nav for settings (used in layout). |
| `src/components/settings/stripe-connect-card.tsx` | Stripe status card (connected vs not); Connect / Manage / Reconnect / Disconnect. |
| `src/components/settings/payments-form.tsx` | Invoice defaults + taxes/fees + payment methods form (used in payments page). |
| `src/components/settings/team-list.tsx` | Team list + add/edit employee + role selector. |
| `src/components/settings/role-editor.tsx` | Role editor: default roles + permissions checklist. |
| `src/lib/permissions.ts` | Permission constants; helper `hasPermission(roleOrPermissions, permission)`; default role → permissions map. |
| `src/lib/stripe-connect.ts` | Server-only: create Connect account/link, login link, disconnect (using Stripe SDK). |
| `src/app/api/stripe/connect/route.ts` | POST: start Connect onboarding; return onboarding URL. |
| `src/app/api/stripe/manage/route.ts` | POST: return Express dashboard login link. |
| `src/app/api/stripe/disconnect/route.ts` | POST: clear stripe_account_id (with permission check + confirmation). |
| `src/app/api/stripe/status/route.ts` | GET: return connected status + account id/email for current org. |
| `src/app/api/settings/team/route.ts` | GET list profiles (with role/permission info); POST invite/create if needed. |
| `src/app/api/settings/team/[id]/route.ts` | PATCH role; permission check; prevent demoting last owner. |
| `src/app/api/settings/roles/route.ts` | GET roles + permissions (for role editor). |
| `src/app/api/settings/permissions/route.ts` | GET current user permissions (for UI gating). |
| `supabase/migrations/006_settings_stripe_rbac.sql` | Organizations, org_id, roles, role_permissions, backfill, optional organization_settings columns. |

---

## 4) Existing Files to Change (Minimal, Backwards Compatible)

| File | Change |
|------|--------|
| `src/app/(main)/settings/page.tsx` | Replace body with Settings Home content (Stripe card, most used, all settings). Remove direct use of `SettingsTabs` here; tabs become routes. |
| `src/app/(main)/settings/settings-tabs.tsx` | **Option A:** Remove or repurpose as a “legacy” tabbed view only for profile+integrations if we keep one combined page. **Option B (preferred):** Stop using tabs; `SettingsTabs` no longer used at `/settings`; Profile and Integrations live at `/settings/profile` and `/settings/integrations`. So: delete or keep `settings-tabs.tsx` only for redirects; do not break existing `ProfileForm` or `IntegrationsTab` components. |
| `src/app/(main)/settings/profile-form.tsx` | No change to fields; may receive `profile` from new profile page. |
| `src/app/(main)/settings/integrations-tab.tsx` | Replace disabled button with “Connect Stripe” that calls new Connect flow (or link to /settings/payments). Minimal change. |
| `src/lib/nav-config.ts` | No route renames; optionally add “Settings” href to `/settings` (already there). |
| `src/app/(main)/layout.tsx` | No change to layout or auth; keep passing role/displayName. |
| `src/app/api/invoices/send/route.ts` | When Stripe Connect is used: accept optional `stripeAccountId` from request or resolve from org; use it for Stripe API calls. Keep existing behavior when no Connect account (platform key only). Do not remove existing params. |
| `src/app/api/invoices/stripe/route.ts` | Optionally support listing invoices for Connect account (stripe_account_id from org). Keep existing platform-key behavior. |
| `src/types/database.ts` | Add types: `Organization`, `Role`, `RolePermission`; extend `Profile` with `org_id` and optional `role_id`. |
| `src/app/(main)/team/page.tsx` | No route change. Optionally add link “Manage roles in Settings” to `/settings/team`. |
| `src/components/sidebar.tsx` / `main-layout-client.tsx` | No structural change; Settings still links to `/settings`. |

---

## 5) Permissions Model (Implementation Detail)

- **Strings (additive):**  
  `settings.view`, `settings.edit`, `team.view`, `team.manage`, `invoices.view`, `invoices.create`, `invoices.send`, `invoices.edit`, `invoices.delete`, `payments.charge`, `payments.refund`, `services.manage`, `schedule.manage`, `customers.manage`, `stripe.connect`, `stripe.manage`, `stripe.disconnect`.
- **Default role mapping:**  
  - Owner: all permissions.  
  - Admin: all except `stripe.disconnect` (configurable).  
  - Manager: scheduling, customers, invoices create/send; no refunds, no disconnect.  
  - Tech: schedule/jobs view, mark complete, job notes/photos; no settings.
- **Resolve permission in app:**  
  - Server: get profile → role_id → role → role_permissions; or from profiles.role when role_id null (backward compat).  
  - Helper: `getUserPermissions(userId)` in server lib; use in API routes and optionally in layout to pass to client for UI gating.

---

## 6) Stripe Connect (Implementation Detail)

- **Type:** Express (or Standard if you prefer; task says “Express if already used” — not used yet, so choose Express for onboarding).  
- **Env vars (additive):**  
  - `STRIPE_SECRET_KEY` (existing)  
  - `STRIPE_CONNECT_CLIENT_ID` (optional; for Connect)  
  - `NEXT_PUBLIC_APP_URL` or existing base URL for return URL.  
- **Flow:**  
  - Connect: create AccountLink (or similar) with return_url to `/settings/payments?connected=1`; store returned account id on organization.  
  - Manage: create LoginLink for Express dashboard.  
  - Disconnect: set `organizations.stripe_account_id` (and stripe_email) to null; require `stripe.disconnect` permission; confirm in UI.  
- **Invoices:** When creating/sending invoice, if org has `stripe_account_id`, use it as `stripeAccount` in Stripe SDK calls; otherwise fall back to platform key.

---

## 7) UI/UX Consistency

- Use existing: `Button`, `Input`, `Label`, `Dialog`, `.card`, `.section-title`, `text-[var(--text)]`, `border-[var(--border)]`, etc.  
- Settings layout: desktop = sidebar (same style as main app sidebar) + main content; mobile = full-width content + back button/breadcrumb.  
- Stripe card: same card style as current Integrations tab.  
- All new pages: responsive (stacked on small screens, side-by-side where appropriate on large).

---

## 8) Safety & Quality

- **Migrations:** Single migration (or two) additive only; backfill so existing users keep `owner` (or current role) and get default org.  
- **Existing users:** All keep full access (Owner or current role) with no data loss.  
- **Lint/typecheck:** Run after changes; fix any new errors.  
- **Tests:** If repo has tests, add minimal tests for permission helper and one Stripe Connect API (e.g. status); otherwise skip to avoid scope creep.

---

## 9) Deliverables Checklist (Post-Implementation)

- [ ] New routes: `/settings` (home), `/settings/profile`, `/settings/integrations`, `/settings/payments`, `/settings/team`.  
- [ ] New components: settings layout, settings nav, Stripe connect card, payments form, team list, role editor.  
- [ ] New API routes: `/api/stripe/connect`, `/api/stripe/manage`, `/api/stripe/disconnect`, `/api/stripe/status`; optional `/api/settings/team`, `/api/settings/roles`, `/api/settings/permissions`.  
- [ ] DB: organizations, roles, role_permissions, profiles.org_id (and optional role_id, organization_settings).  
- [ ] Env vars: document STRIPE_CONNECT_CLIENT_ID and return URL.  
- [ ] Dry-run summary: list every file added/changed and why.

---

## 10) Order of Implementation (Recommended)

1. **Migration:** Add organizations, org_id, roles, role_permissions, backfill; optional organization_settings.  
2. **Types & permissions lib:** Update database types; add `src/lib/permissions.ts` and server helper to resolve permissions.  
3. **Stripe Connect lib + API:** Implement Connect/manage/disconnect/status; store account on org.  
4. **Settings layout + Settings Home:** New layout, new `/settings` page with Stripe card and categories.  
5. **Profile & Integrations as routes:** Move Profile and Integrations to `/settings/profile` and `/settings/integrations`; update Integrations “Connect” to use new API.  
6. **Payments page:** Full Payments & Invoicing page with Stripe block and invoice/tax/payment-method options.  
7. **Team & Roles page:** Team list, add/edit, role editor, permissions; enforce in API.  
8. **Permission checks:** Add server-side checks to settings and Stripe APIs; add UI gating where needed.  
9. **Invoice send:** Use Connect account from org when present.  
10. **Lint, typecheck, dry-run summary.**

---

*End of plan. Proceed to implementation only after approval.*
