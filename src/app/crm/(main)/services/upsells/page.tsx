import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { UpsellsTable } from './upsells-table'

export default async function UpsellsPage() {
  const auth = await getAuthAndPermissions()
  const orgId = auth?.orgId ?? null

  const supabase = await createClient()
  const query = supabase.from('service_upsells').select('*').order('category').order('sort_order')
  const { data: upsells } = orgId
    ? await query.or(`org_id.eq.${orgId},org_id.is.null`)
    : await query.is('org_id', null)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="page-title text-white">Add-ons</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Optional extras by category (e.g. Ceramic, Extras). Shown during booking and when creating jobs and invoices.</p>
      </div>
      <UpsellsTable initialUpsells={upsells ?? []} orgId={orgId} />
    </div>
  )
}
