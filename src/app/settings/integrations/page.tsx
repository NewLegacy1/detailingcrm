import { redirect } from 'next/navigation'

/**
 * Legacy path: Google OAuth callback used to redirect here.
 * Redirect to the correct CRM settings page so old links and bookmarks don't 404.
 */
export default async function SettingsIntegrationsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params?.google_connected) query.set('google_connected', String(params.google_connected))
  if (params?.google_error) query.set('google_error', String(params.google_error))
  const qs = query.toString()
  redirect(qs ? `/crm/settings/bookings?${qs}` : '/crm/settings/bookings')
}
