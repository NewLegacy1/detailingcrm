import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { InvoicesList } from './invoices-list'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; job?: string }>
}) {
  const { customer: initialCustomerId, job: initialJobId } = await searchParams
  const supabase = await createAuthClient()
  const auth = await getAuthAndPermissions()
  let orgId: string | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    orgId = profile?.org_id ?? null
  }
  const locationId = auth?.locationId ?? null

  const clientsQuery = orgId
    ? supabase.from('clients').select('id, name, email').eq('org_id', orgId).order('name')
    : supabase.from('clients').select('id, name, email').limit(0)
  let invoicesQuery = supabase
    .from('invoices')
    .select('*, client:clients(id, name, email), job:jobs(id, service:services(name), location_id)')
    .order('created_at', { ascending: false })
  const [{ data: invoicesRaw }, { data: clients }, { data: initialJob }] = await Promise.all([
    invoicesQuery,
    clientsQuery,
    initialJobId
      ? supabase.from('jobs').select('id, services(name, base_price)').eq('id', initialJobId).single()
      : { data: null },
  ])
  let invoices = invoicesRaw ?? []
  if (locationId) {
    invoices = invoices.filter((inv) => {
      const job = inv.job as { location_id?: string | null } | null
      return job?.location_id === locationId
    })
  }

  const service = initialJob?.services
    ? (Array.isArray(initialJob.services) ? initialJob.services[0] : initialJob.services) as { name: string; base_price: number } | undefined
    : undefined
  const initialLineFromJob = service
    ? [{ description: service.name, quantity: 1, unit_amount: Number(service.base_price ?? 0), amount: Number(service.base_price ?? 0) }]
    : undefined

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <h1 className="page-title hidden md:block" style={{ color: 'var(--text-1)' }}>Invoices</h1>
      <InvoicesList
        initialInvoices={invoices ?? []}
        clients={clients ?? []}
        initialCustomerId={initialCustomerId ?? undefined}
        initialJobId={initialJobId ?? undefined}
        initialLineItems={initialLineFromJob}
      />
    </div>
  )
}
