# Booking System Integration

Client-facing booking lives under **`/book/[slug]`**. It is profile-driven and uses the same Supabase org and services data as the CRM.

## Routes

- **Platform link:** `https://your-app.com/book/[booking_slug]`
- **Custom domain:** e.g. `https://book.customerdomain.com` → middleware resolves `booking_domain` to a slug and rewrites to `/book/[slug]`.

## Supabase columns / tables used by booking

### Organizations

| Column | Purpose |
|--------|--------|
| `booking_slug` | Unique slug in the URL (e.g. `acme-detail` → `/book/acme-detail`). |
| `booking_domain` | Optional custom domain (e.g. `book.acme.com`). Set for custom-domain booking. |
| `map_lat`, `map_lng` | Optional map center (decimal). If null, a default center is used. |
| `name` | Fallback business name. |
| `booking_display_name` | Name shown on the booking page (“Book with …”). |
| `booking_tagline` | Optional tagline under the title. |
| `logo_url` | Optional logo on the booking card. |
| `booking_show_prices` | If true, service prices are shown in the right-hand panel. |

### Services

Booking reads from the existing **`services`** table (same as the CRM). No extra columns are required. It uses:

- `id`, `name`, `duration_mins`, `base_price`, `description`

Services are shared across the app; the booking page lists all services. To restrict by org later, you could add `org_id` to `services` and filter in the booking page query.

## Middleware (custom domain)

In `src/lib/supabase/middleware.ts`:

1. Compare `Host` to the main app domain from `NEXT_PUBLIC_APP_URL`.
2. If different, call Supabase RPC `get_booking_slug_for_domain(domain)` (anon allowed).
3. If a slug is returned, rewrite the request to `/book/[slug]`.

So one code path serves both platform and custom-domain booking.

## Environment

- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** – Required for the booking map and Places Autocomplete. Enable Maps JavaScript API and Places API.
- **`NEXT_PUBLIC_APP_URL`** – Main app URL (e.g. `https://app.yourapp.com`). Used to detect custom booking domains; if unset, custom-domain rewrite is skipped.

## CRM settings alignment

To support booking from the CRM:

1. **Booking slug** – Ensure org has `booking_slug` set (e.g. in org/settings). Migration `024_booking_domain_and_map.sql` does not set it; use existing or new settings UI.
2. **Map center** – Optional: add `map_lat` / `map_lng` to org settings and save them so the booking map opens centered on the business.
3. **Custom domain** – Optional: add `booking_domain` to org settings (e.g. `book.theirdomain.com`) and point that host’s DNS to this app so middleware can resolve it.

## Flow summary

1. User opens `your-app.com/book/[slug]` or a custom domain.
2. Server loads the org by `booking_slug` (or after middleware rewrite) and services, and passes a single **booking context** (name, logo, map center, services, showPrices) to the client.
3. Client renders full-screen dark map, centered “Book with [Name]” card with address search (Places Autocomplete), and (after address) the right-hand service panel and bottom route summary.
