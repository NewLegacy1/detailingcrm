import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { crmPath } from '@/lib/crm-path'
import { UpsellsTable } from './upsells-table'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

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
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={crmPath('/services')} className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)]">
            <ChevronLeft className="h-4 w-4" />
            Back to services
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="page-title text-white">Add-ons</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Optional extras by category (e.g. Ceramic, Extras). Shown during booking and when creating jobs and invoices.</p>
      </div>
      <UpsellsTable initialUpsells={upsells ?? []} orgId={orgId} />
    </div>
  )
}
