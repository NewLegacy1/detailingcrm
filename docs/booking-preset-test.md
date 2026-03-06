# Booking page light/dark preset – quick test

## What was fixed
The public booking page (`/book/[slug]`) now picks **light** or **dark** text/surface presets so text stays readable on any primary (background) color.

- **Light primary color** (or Theme = Light in Settings → Branding) → dark text, dark-tinted borders/surfaces.
- **Dark primary color** (or Theme = Dark) → light text, light-tinted borders/surfaces.
- **No theme set** → auto-detect from primary color luminance.

## How to test

1. **Start the app**
   ```bash
   npm run dev
   ```

2. **Sign in** and go to **Settings → Branding** (or **CRM → Settings → Branding**).

3. **Test dark background (default)**
   - Set **Primary color** to a dark value (e.g. `#212121` or leave default).
   - Set **Theme** to **Dark** (or leave unset).
   - Save. Open your booking page: `/book/YOUR-SLUG` (use the slug from the same Branding page).
   - **Expect:** Light text, light borders/surfaces on the header, search card, and side panel.

4. **Test light background**
   - In Branding, set **Primary color** to a light value (e.g. `#f1f5f9` or `#ffffff`).
   - Set **Theme** to **Light** (or leave unset; it will auto-detect).
   - Save. Reload `/book/YOUR-SLUG`.
   - **Expect:** Dark text, dark-tinted borders/surfaces everywhere (header, search card, panel, inputs).

5. **Optional: override with Theme**
   - With a **light** primary color, set **Theme** to **Dark** → should still show light text (theme wins).
   - With a **dark** primary color, set **Theme** to **Light** → should show dark text.

If both presets render readable text and the build passes, the fix is working.
