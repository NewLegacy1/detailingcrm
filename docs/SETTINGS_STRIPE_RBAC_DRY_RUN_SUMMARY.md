# Settings + Stripe Connect + RBAC — Implementation Summary

**Status:** Implemented. Build passes.

---

## New routes

| Route | Purpose |
|-------|--------|
| `/settings` | Settings Home: business name header, Stripe status card, “Most used” links, “All settings” list |
| `/settings/profile` | Profile form (display name, business name, Logo URL) |
| `/settings/integrations` | Integrations: Stripe Connect card |
| `/settings/payments` | Payments & Invoicing: Stripe block + invoice defaults, taxes/fees, payment methods |
| `/settings/team` | Team & Roles: member list, edit role, role permissions viewer |

---

## New components

| File | Purpose |
|------|--------|
| `src/components/settings/settings-nav.tsx` | Sidebar nav for settings (desktop) and category links |
| `src/components/settings/stripe-connect-card.tsx` | Stripe status: Connect / Manage / Reconnect / Disconnect |
| `src/components/settings/payments-form.tsx` | Invoice defaults, taxes & fees, payment method toggles |
| `src/components/settings/team-list.tsx` | Team members list + edit-role dialog |
| `src/components/settings/role-editor.tsx` | Collapsible list of roles and their permissions |

---

## New API routes

| Method + path | Purpose |
|---------------|--------|
| `POST /api/stripe/connect` | Start Connect onboarding; returns redirect URL. Requires `stripe.connect`. |
| `POST /api/stripe/manage` | Return Express dashboard login URL. Requires `stripe.manage`. |
| `POST /api/stripe/disconnect` | Clear `stripe_account_id` on org. Requires `stripe.disconnect`. |
| `GET /api/stripe/status` | Return `{ connected, accountId, email }`. Requires settings view or connect. |
| `GET /api/settings/organization` | Return current org (for payments form). Requires `settings.view`. |
| `PATCH /api/settings/organization` | Update org settings (invoice defaults, tax, etc.). Requires `settings.edit`. |
| `GET /api/settings/team` | List profiles (team). Requires `team.view`. |
| `PATCH /api/settings/team/[id]` | Update profile role. Requires `team.manage`. Prevents demoting last owner. |
| `GET /api/settings/roles` | List roles and their permissions. Requires `team.view`. |
| `GET /api/settings/permissions` | Return current user’s permissions (for UI gating). |

---

## Database changes

| Migration | Content |
|-----------|--------|
| `006_settings_stripe_rbac.sql` | `organizations` table; `profiles.org_id`, `profiles.role_id`; `roles` and `role_permissions`; backfill; org settings columns; RLS. |
| `007_profiles_role_manager.sql` | Allow `manager` in `profiles.role` check. |

**Backward compatibility:** Existing users keep `profiles.role`; backfill sets `org_id` to default org and `role_id` from role (pending → owner). No existing tables or columns removed.

---

## New / updated app files

| File | Change |
|------|--------|
| `src/app/(main)/settings/layout.tsx` | **New.** Layout with “Back to app”, sidebar (desktop), and settings nav. |
| `src/app/(main)/settings/page.tsx` | **Replaced.** Now Settings Home (Stripe card, most used, all settings). |
| `src/app/(main)/settings/profile/page.tsx` | **New.** Loads profile and renders existing `ProfileForm`. |
| `src/app/(main)/settings/integrations/page.tsx` | **New.** Renders `StripeConnectCard`. |
| `src/app/(main)/settings/payments/page.tsx` | **New.** Server component: Stripe status + `PaymentsForm`. |
| `src/app/(main)/settings/team/page.tsx` | **New.** Renders `TeamList` and `RoleEditor`. |

---

## Lib and types

| File | Change |
|------|--------|
| `src/lib/permissions.ts` | **New.** Permission constants, `hasPermission`, default role→permissions, `effectiveRoleKey`. |
| `src/lib/permissions-server.ts` | **New.** `getAuthAndPermissions`, `requirePermission`, `requireOwnerOrAdmin`. |
| `src/lib/stripe-connect.ts` | **New.** Server-only: `createConnectAccountAndLink`, `createLoginLink`, `getAccountDetails`. |
| `src/types/database.ts` | **Extended.** `Organization`, `Role`, `RolePermission`; `Profile` + `org_id`, `role_id`; `UserRole` + `manager`. |
| `src/lib/nav-config.ts` | **Updated.** Added `manager` to Dashboard, Customers, Jobs, Schedule, Invoices, Team. |

---

## Modified existing files

| File | Change |
|------|--------|
| `src/app/api/invoices/send/route.ts` | Auth replaced with `requirePermission(INVOICES_SEND)`; resolve org `stripe_account_id`; all Stripe calls use `stripeAccount` when Connect is set. |
| *(No other existing routes or components removed or renamed.)* | |

---

## Env vars

- **Existing:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` (optional).
- **Optional for Connect return URL:** `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` (used as base for Stripe return/refresh URLs).

No new required env vars. Stripe Connect works with existing `STRIPE_SECRET_KEY` (platform key).

---

## How to test

1. **Run migrations**  
   Apply `006_settings_stripe_rbac.sql` and `007_profiles_role_manager.sql` (e.g. `supabase db push` or run in SQL editor).

2. **Stripe Connect**  
   - As owner, open **Settings → Payments** or **Settings Home**.  
   - Click **Connect Stripe**; you should be redirected to Stripe onboarding.  
   - Complete or skip; on return to `/settings/payments?connected=1`, status should show Connected.  
   - Use **Manage in Stripe** to open Express dashboard, **Disconnect** to clear (with confirm).

3. **Role checks**  
   - As owner: all settings and Stripe actions work.  
   - As admin: Connect/Manage work; Disconnect requires `stripe.disconnect` (admin default: no).  
   - As technician: no access to `/settings` (nav hidden); direct URL to `/settings` can be blocked by permission in layout if desired.  
   - **Team:** Settings → Team: list members, edit role (Owner/Admin/Manager/Technician/Pending). Try demoting the only owner → should get “Cannot demote the last owner”.

4. **Invoice send**  
   - With Stripe connected, send an invoice from Invoices; it should use the Connect account.  
   - Without Connect, behavior unchanged (platform key if set, or draft).

---

## Safe defaults

- Existing users: `profiles.role` unchanged; backfill gives them default `org_id` and `role_id` (pending → owner).  
- Owner role: all permissions; cannot be demoted if they are the last owner.  
- New role **manager** added; nav and RBAC include it.
