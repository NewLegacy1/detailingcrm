import { createAuthClient } from '@/lib/supabase/server'
import { CustomerDetailPane } from './customers-master-detail'
import { CustomersListSidebar } from './customers-list-sidebar'
import { CustomersMobileLayout } from './customers-mobile-layout'
import { EmptyState } from '@/components/ui/empty-state'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; group?: string }>
}) {
  const { customer: selectedId, group: groupId } = await searchParams
  const supabase = await createAuthClient()

  let orgId: string | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    orgId = profile?.org_id ?? null
  }

  let list: { id: string; name: string; email: string | null; phone: string | null; address?: string | null; notes: string | null }[] = []
  if (orgId) {
    const { data: orgCustomers, error: orgError } = await supabase
      .from('clients')
      .select('id, name, email, phone, address, notes')
      .eq('org_id', orgId)
      .order('name', { ascending: true })
    if (orgError) console.error('Error fetching customers:', orgError)
    list = orgCustomers ?? []
  }
  const groups: { id: string; name: string }[] = []
  if (orgId) {
    const { data: groupsData } = await supabase
      .from('customer_groups')
      .select('id, name')
      .eq('org_id', orgId)
      .order('name')
    if (groupsData) groups.push(...groupsData)

    if (groupId) {
      const { data: members } = await supabase
        .from('customer_group_members')
        .select('client_id')
        .eq('group_id', groupId)
      const ids = new Set((members ?? []).map((m) => m.client_id))
      list = list.filter((c) => ids.has(c.id))
    }
  }

  const selected = selectedId ? list.find((c) => c.id === selectedId) : null

  let vehicles: {
    id: string
    make: string
    model: string
    year: number | null
    color: string | null
    notes: string | null
  }[] = []
  let jobs: {
    id: string
    scheduled_at: string
    status: string
    services: { name: string } | { name: string }[] | null
  }[] = []
  let invoices: {
    id: string
    status: string
    amount_total: number
    due_date: string | null
    created_at: string
  }[] = []
  let communications: {
    id: string
    channel: string
    direction: string
    body: string | null
    created_at: string
    job_id: string | null
  }[] = []

  let customerGroupIds: string[] = []
  if (selectedId) {
    const [vRes, jRes, iRes, cRes, gRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*')
        .eq('customer_id', selectedId)
        .order('created_at', { ascending: false }),
      supabase
        .from('jobs')
        .select('id, scheduled_at, status, services(name)')
        .eq('customer_id', selectedId)
        .order('scheduled_at', { ascending: false })
        .limit(50),
      supabase
        .from('invoices')
        .select('id, status, amount_total, due_date, created_at')
        .eq('client_id', selectedId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('communications')
        .select('id, channel, direction, body, created_at, job_id')
        .eq('client_id', selectedId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('customer_group_members')
        .select('group_id')
        .eq('client_id', selectedId),
    ])
    vehicles = vRes.data ?? []
    jobs = jRes.data ?? []
    invoices = iRes.data ?? []
    communications = cRes.data ?? []
    customerGroupIds = (gRes.data ?? []).map((r) => r.group_id)
  }

  return (
    <CustomersMobileLayout
      selectedId={selectedId ?? null}
      listSidebar={
        <CustomersListSidebar
          customers={list}
          selectedId={selectedId ?? null}
          groups={groups}
          selectedGroupId={groupId ?? null}
        />
      }
      detailContent={
        selected && selectedId ? (
          <CustomerDetailPane
            customer={{
              id: selected.id,
              name: selected.name,
              email: selected.email,
              phone: selected.phone,
              address: (selected as { address?: string }).address ?? null,
              notes: selected.notes,
            }}
            vehicles={vehicles}
            jobs={jobs}
            invoices={invoices}
            communications={communications}
            groups={groups}
            customerGroupIds={customerGroupIds}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[280px]">
            <EmptyState
              iconName="Users"
              headline="Select a customer"
              subtext="Choose a customer from the list or add a new one."
            />
          </div>
        )
      }
    />
  )
}
