import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { crmPath } from '@/lib/crm-path'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { ServicesTable } from './services-table'
import { Button } from '@/components/ui/button'

export default async function ServicesPage() {
  const auth = await getAuthAndPermissions()
  const orgId = auth?.orgId ?? null

  const supabase = await createClient()
  const [servicesRes, categoriesRes] = orgId
    ? await Promise.all([
        supabase.from('services').select('*').eq('org_id', orgId).order('sort_order').order('name', { ascending: true }),
        supabase.from('service_categories').select('*').eq('org_id', orgId).order('sort_order').order('name', { ascending: true }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }]

  const services = servicesRes.data ?? []
  const categories = categoriesRes.data ?? []
  if (servicesRes.error) console.error('Error fetching services:', servicesRes.error)
  if (categoriesRes.error) console.error('Error fetching categories:', categoriesRes.error)

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title hidden md:block" style={{ color: 'var(--text-1)' }}>Services</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={crmPath('/services/upsells')}>Add-ons</Link>
          </Button>
        </div>
      </div>
      {orgId == null ? (
        <p className="text-sm text-[var(--text-muted)]">No organization linked. Services are scoped to your business.</p>
      ) : null}
      <p className="text-sm text-[var(--text-muted)]">
        The order of categories here is the same order shown on your booking page. Use the arrows next to each category to reorder.
      </p>
      <ServicesTable initialServices={services} initialCategories={categories} orgId={orgId} />
    </div>
  )
}
