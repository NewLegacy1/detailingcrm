import { createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocationsClient } from './locations-client'
import type { Location } from '@/types/locations'
import { crmPath } from '@/lib/crm-path'
import { allowProFeatures } from '@/lib/pro-features'

export default async function SettingsLocationsPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=' + crmPath('/settings/locations'))

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id ?? null
  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="page-title text-[var(--text)]">Locations</h1>
        <p className="text-[var(--text-muted)]">No organization found.</p>
      </div>
    )
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan, timezone, multi_location_enabled')
    .eq('id', orgId)
    .single()

  const multiLocationEnabled = org?.multi_location_enabled === true
  // Pro UI when: plan is Pro (or FORCE_PRO_FEATURES=true), or multi-location already enabled
  const isPro = allowProFeatures(org?.subscription_plan) || multiLocationEnabled
  const orgTimezone = org?.timezone ?? 'America/Toronto'

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const locationsList = (locations ?? []) as Location[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title text-[var(--text)]">Locations</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage locations for multi-location booking (Pro). When enabled and you have more than one active location, customers choose a location on your booking page.
        </p>
      </div>
      <LocationsClient
        initialLocations={locationsList}
        orgTimezone={orgTimezone}
        isPro={isPro}
        multiLocationEnabled={multiLocationEnabled}
      />
    </div>
  )
}
