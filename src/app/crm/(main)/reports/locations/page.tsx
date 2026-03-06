import { createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { ReportsLocationsClient } from './reports-locations-client'
import type { Location } from '@/types/locations'

export const dynamic = 'force-dynamic'

export default async function ReportsLocationsPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id ?? null
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
        <Link href={crmPath('/reports')} className="text-[var(--accent)] underline">Back to reports</Link>
      </div>
    )
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address')
    .eq('org_id', orgId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const locationsList = (locations ?? []) as Pick<Location, 'id' | 'name' | 'address'>[]

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div>
        <Link href={crmPath('/reports')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Back to reports</Link>
        <h1 className="page-title mt-2" style={{ color: 'var(--text-1)' }}>Reports by location</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Revenue and booking count per location (Pro).
        </p>
      </div>
      <ReportsLocationsClient locations={locationsList} />
    </div>
  )
}
