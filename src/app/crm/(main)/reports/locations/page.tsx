import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { crmPath } from '@/lib/crm-path'
import { ReportsLocationsClient } from './reports-locations-client'
import type { Location } from '@/types/locations'

export const dynamic = 'force-dynamic'

export default async function ReportsLocationsPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const auth = await getAuthAndPermissions()
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id ?? null
  const locationId = auth?.locationId ?? null
  if (!orgId) {
    return (
      <div className="p-6" style={{ color: 'var(--text-2)' }}>
        No organization assigned.
      </div>
    )
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()

  if (org?.subscription_plan !== 'pro') {
    return (
      <div className="p-6 space-y-4" style={{ color: 'var(--text-2)' }}>
        <p>Per-location reporting is available on the Pro plan.</p>
        <Link
          href={crmPath('/reports')}
          className="inline-flex items-center justify-center md:justify-start gap-0 md:gap-1 mt-2 text-[var(--accent)] underline md:no-underline hover:opacity-90"
          aria-label="Back to reports"
        >
          <ChevronLeft className="h-8 w-8 md:h-4 md:w-4 shrink-0 md:opacity-100" strokeWidth={2.25} />
          <span className="hidden md:inline underline">Back to reports</span>
        </Link>
      </div>
    )
  }

  let locationsQuery = supabase
    .from('locations')
    .select('id, name, address')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (locationId) locationsQuery = locationsQuery.eq('id', locationId)
  const { data: locations } = await locationsQuery

  const locationsList = (locations ?? []) as Pick<Location, 'id' | 'name' | 'address'>[]

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div>
        <Link
          href={crmPath('/reports')}
          className="inline-flex items-center justify-center md:justify-start gap-0 md:gap-1 rounded-lg min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 text-sm text-[var(--text-muted)] hover:text-[var(--text)] -ml-2 md:ml-0"
          aria-label="Back to reports"
        >
          <ChevronLeft className="h-8 w-8 md:h-4 md:w-4 shrink-0" strokeWidth={2.25} />
          <span className="hidden md:inline">Back to reports</span>
        </Link>
        <h1 className="page-title mt-2" style={{ color: 'var(--text-1)' }}>Reports by location</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Revenue and booking count per location (Pro).
        </p>
      </div>
      <ReportsLocationsClient locations={locationsList} />
    </div>
  )
}
