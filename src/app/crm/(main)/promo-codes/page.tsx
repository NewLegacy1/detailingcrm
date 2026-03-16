import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { PromoCodesClient } from './promo-codes-client'

export default async function PromoCodesPage() {
  const supabase = await createAuthClient()
  const auth = await getAuthAndPermissions()
  const orgId = auth?.orgId ?? null
  if (!orgId || !auth?.userId) {
    redirect('/login')
  }

  const locationId = auth?.locationId ?? null
  let promosQuery = supabase
    .from('promo_codes')
    .select('id, name, code, discount_type, discount_value, usage_limit, uses_per_customer, used_count, total_discount_amount, valid_from, valid_until, is_active, created_at, location_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (locationId) {
    promosQuery = promosQuery.eq('location_id', locationId)
  }
  const { data: promos } = await promosQuery

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <h1 className="page-title" style={{ color: 'var(--text-1)' }}>
        Promo codes
      </h1>
      <PromoCodesClient initialPromos={promos ?? []} />
    </div>
  )
}
