# Plugging the onboarding flow into your CRM

You can run this flow inside your existing CRM app so users see it once (e.g. after signup) and are then sent into the main app.

---

## Option A: Copy the onboarding code into your CRM (recommended)

### 1. Copy these files into your CRM repo

Copy the whole `src` folder from this onboarding project into your CRM. Two ways to do it:

**Option A1 – Single folder**  
Put everything under one folder, e.g. `src/onboarding/`:

```
your-crm/
  src/
    onboarding/
      index.css
      types.ts
      OnboardingFlow.tsx
      OnboardingFlow.css
      SplitLayout.tsx
      SplitLayout.css
      LeftPanel.tsx
      LeftPanel.css
      StepProgress.tsx
      StepProgress.css
      BenefitsList.tsx
      BenefitsList.css
      BookingPreviewMock.tsx
      BookingPreviewMock.css
      Confetti.tsx
      Confetti.css
      steps/
        StepWelcome.tsx
        StepWelcome.css
        StepBusinessBasics.tsx
        StepForm.css
        StepOperatingDetails.tsx
        StepOperatingDetails.css
        StepBookingCustomization.tsx
        StepBookingCustomization.css
        StepIntegrations.tsx
        StepIntegrations.css
        StepCustomerImport.tsx
        StepCustomerImport.css
        StepCompletion.tsx
        StepCompletion.css
```

**Option A2 – Alongside existing code**  
Merge the files into your existing `src` (e.g. `src/components/onboarding/`, `src/styles/`, etc.). Keep the same relative imports between the onboarding files.

### 2. Dependencies

Your CRM already needs React 18. This flow only uses:

- `react`
- `react-dom`

No extra packages.

### 3. Add a route that renders the flow

Example with **React Router**:

```tsx
import { OnboardingFlow } from './onboarding/OnboardingFlow'
import './onboarding/index.css'  // onboarding styles (or merge into your global CSS)

// In your router:
<Route path="/onboarding" element={
  <OnboardingFlow
    redirectUrl="/dashboard"
    userName={currentUser?.name}
    onComplete={async (data) => {
      await yourApi.finishOnboarding(data)  // send data to your backend
    }}
  />
} />
```

Example with **Next.js** (App Router):

```tsx
// app/onboarding/page.tsx
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import '@/components/onboarding/index.css'

export default function OnboardingPage() {
  return (
    <OnboardingFlow
      redirectUrl="/dashboard"
      userName={undefined}  // or from auth/session
      onComplete={async (data) => {
        'use server'
        await saveOnboardingData(data)
      }}
    />
  )
}
```

### 4. When to show onboarding

- **After signup:** Redirect new users to `/onboarding`; when they finish, `redirectUrl` (e.g. `/dashboard`) takes them into the app.
- **First login:** If the user has no `onboardingCompletedAt`, send them to `/onboarding` instead of the dashboard.

### 5. Props you can pass

| Prop | Type | Description |
|------|------|-------------|
| `redirectUrl` | `string` | Where to send the user when they click "View & share booking page". Default: `'/dashboard'`. |
| `userName` | `string` | Pre-fill the welcome step (e.g. "Welcome, **Nathan**!"). |
| `onComplete` | `(data: OnboardingData) => void \| Promise<void>` | Called with the collected data before redirect. Use it to POST to your API, then the flow redirects. |

### 6. Using the submitted data in your backend

`onComplete` receives an `OnboardingData` object. For the logo you get a `File` (from the browser); you need to upload it yourself in `onComplete` (e.g. to S3 or your API) and store the resulting URL. Example:

```ts
onComplete={async (data) => {
  let logoUrl = ''
  if (data.logoFile) {
    const formData = new FormData()
    formData.append('logo', data.logoFile)
    const res = await fetch('/api/upload-logo', { method: 'POST', body: formData })
    const json = await res.json()
    logoUrl = json.url
  }
  await yourApi.finishOnboarding({
    businessName: data.businessName,
    brandColor: data.brandColor,
    logoUrl,
    services: data.services,
    stripeConnected: data.stripeConnected,
    googleCalendarConnected: data.googleCalendarConnected,
    importCustomers: data.importCustomers,
    importFile: data.importFile,
  })
}}
```

---

## Option B: Keep onboarding as a separate app

If you prefer not to copy source:

1. Build this repo: `npm run build`.
2. Deploy the `dist` output to a path like `https://yourcrm.com/onboarding/` (or a subdomain).
3. Redirect new users to that URL. Set the redirect into the main CRM via `window.__CRM_REDIRECT_URL__` before loading the onboarding app:

   ```html
   <script>window.__CRM_REDIRECT_URL__ = 'https://app.yourcrm.com/dashboard';</script>
   <script type="module" src="/onboarding/assets/index-xxx.js"></script>
   ```

4. To persist data, you’d need to post from the onboarding app to your CRM API (e.g. in `onComplete` before redirect), or use a shared backend that the main app reads after redirect.

---

## A/B variants (optional)

The flow reads `?variant=` from the URL:

- **No param or `?variant=a`** – Full split-screen with left panel.
- **`?variant=b`** – Minimal single column (no left panel).
- **`?variant=c`** – Same as A but Stripe is required (no “Skip for now”).

Use these when you run A/B tests from your CRM (e.g. redirect to `/onboarding?variant=b` for a segment of users).

---

## Summary

1. Copy `src` (or the list above) into your CRM.
2. Add a route (e.g. `/onboarding`) that renders `<OnboardingFlow redirectUrl="/dashboard" userName={…} onComplete={…} />`.
3. In `onComplete`, call your API with the collected data and upload the logo file if present.
4. After `onComplete` runs, the user is sent to `redirectUrl` (your actual CRM).
