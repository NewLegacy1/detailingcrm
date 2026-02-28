'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { VehicleForm } from '@/app/crm/(main)/customers/[id]/vehicle-form'
import { Plus, MapPin, Mail, ClipboardList, Folder, MessageSquare } from 'lucide-react'
import type { JobStatusType } from '@/components/ui/status-pill'

interface CustomerDetailPaneProps {
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address?: string | null
    notes: string | null
  }
  vehicles: {
    id: string
    make: string
    model: string
    year: number | null
    color: string | null
    notes: string | null
  }[]
  jobs: {
    id: string
    scheduled_at: string
    status: string
    services: { name: string } | { name: string }[] | null
  }[]
  invoices: {
    id: string
    status: string
    amount_total: number
    due_date: string | null
    created_at: string
  }[]
  communications: {
    id: string
    channel: string
    direction: string
    body: string | null
    created_at: string
    job_id: string | null
  }[]
  groups?: { id: string; name: string }[]
  customerGroupIds?: string[]
}

type JobTab = 'upcoming' | 'cancelled' | 'completed'

export function CustomerDetailPane({
  customer,
  vehicles,
  jobs,
  invoices,
  communications,
  groups = [],
  customerGroupIds = [],
}: CustomerDetailPaneProps) {
  const router = useRouter()
  const [jobTab, setJobTab] = useState<JobTab>('upcoming')
  const [addVehicleOpen, setAddVehicleOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<typeof vehicles[0] | null>(null)
  const upcomingJobs = useMemo(
    () =>
      jobs.filter((j) =>
        ['scheduled', 'en_route', 'in_progress'].includes(j.status)
      ),
    [jobs]
  )
  const cancelledJobs = useMemo(
    () => jobs.filter((j) => ['cancelled', 'no_show'].includes(j.status)),
    [jobs]
  )
  const completedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'done'),
    [jobs]
  )
  const jobsForTab =
    jobTab === 'upcoming'
      ? upcomingJobs
      : jobTab === 'cancelled'
        ? cancelledJobs
        : completedJobs

  return (
    <div className="flex flex-col gap-8 overflow-auto">
      {/* Header: name, email, phone, address + Quick actions */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
          {customer.name}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--text-2)' }}>
          {customer.email && <span>{customer.email}</span>}
          {customer.phone && <span>{customer.phone}</span>}
        </div>
        {customer.address && (
          <div className="mt-2 flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            {customer.address}
          </div>
        )}
        {customer.notes && (
          <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: 'var(--text-3)' }}>
            {customer.notes}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href={`/jobs/new?customer=${customer.id}`}>New Job</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/invoices?customer=${customer.id}`}>Send Invoice</Link>
          </Button>
        </div>
      </Card>

      <section>
        <h2 className="section-label mb-3 flex items-center gap-2">
          <Folder className="h-4 w-4 text-[var(--accent)]" />
          Groups
        </h2>
        <Card className="p-4">
          {groups.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Create groups in the sidebar (under &quot;Groups&quot; click the +), then assign this customer to groups here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {groups.map((g) => {
                const isInGroup = customerGroupIds.includes(g.id)
                return (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <input
                      type="checkbox"
                      checked={isInGroup}
                      onChange={async () => {
                        const res = await fetch(`/api/customers/groups/${g.id}/members`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ clientId: customer.id, add: !isInGroup }),
                        })
                        if (res.ok) router.refresh()
                      }}
                      className="rounded border-[var(--border)]"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-1)' }}>{g.name}</span>
                  </label>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      {/* Garage */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-label">Garage</h2>
          <Button variant="ghost" size="sm" onClick={() => setAddVehicleOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Add vehicle
          </Button>
        </div>
        {vehicles.length === 0 ? (
          <EmptyState
            iconName="Car"
            headline="No vehicles"
            subtext="Add a vehicle to track year, make, model, and color."
            ctaLabel="Add vehicle"
            ctaOnClick={() => setAddVehicleOpen(true)}
          />
        ) : (
          <ul className="space-y-2">
            {vehicles.map((v) => (
              <li key={v.id}>
                <Card
                  className="transition-all duration-200 hover:translate-y-[-2px] cursor-pointer"
                  onClick={() => setEditVehicle(v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setEditVehicle(v)}
                  style={{ color: 'var(--text-2)' }}
                >
                  <div className="block p-4 text-sm hover:opacity-90">
                    {v.year ? `${v.year} ` : ''}
                    {v.make} {v.model}
                    {v.color ? ` · ${v.color}` : ''}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setAddVehicleOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Add vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm
            customerId={customer.id}
            onSuccess={() => { setAddVehicleOpen(false); router.refresh() }}
            onCancel={() => setAddVehicleOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editVehicle} onOpenChange={(open) => !open && setEditVehicle(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setEditVehicle(null)} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Edit vehicle</DialogTitle>
          </DialogHeader>
          {editVehicle && (
            <VehicleForm
              customerId={customer.id}
              vehicle={editVehicle}
              onSuccess={() => { setEditVehicle(null); router.refresh() }}
              onCancel={() => setEditVehicle(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* All Service tabs: Upcoming / Completed / Cancelled — job cards */}
      <section>
        <h2 className="section-label mb-3">All Service</h2>
        <div className="mb-4 flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
          {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setJobTab(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${
                jobTab === tab ? 'bg-[var(--accent)]' : ''
              }`}
              style={{
                color: jobTab === tab ? 'white' : 'var(--text-3)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        {jobsForTab.length === 0 ? (
          <EmptyState
            iconName="ClipboardList"
            headline={`No ${jobTab} jobs`}
            subtext={
              jobTab === 'upcoming'
                ? 'Scheduled or in-progress jobs will appear here.'
                : jobTab === 'completed'
                  ? 'Completed jobs will appear here.'
                  : 'Cancelled or no-show jobs will appear here.'
            }
            ctaLabel="New Job"
            ctaHref={`/jobs/new?customer=${customer.id}`}
          />
        ) : (
          <ul className="space-y-2">
            {jobsForTab.map((job) => {
              const svc = Array.isArray(job.services)
                ? job.services[0]
                : job.services
              return (
                <li key={job.id}>
                  <Card className="transition-all duration-200 hover:translate-y-[-2px]">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-1)' }}>
                            {svc?.name ?? 'Job'}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                            {new Date(job.scheduled_at).toLocaleDateString(
                              'en-US',
                              {
                                dateStyle: 'medium',
                              }
                            )}
                          </p>
                        </div>
                        <StatusPill
                          status={job.status as JobStatusType}
                          type="job"
                        />
                      </div>
                    </Link>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Communications */}
      <section>
        <h2 className="section-label mb-3">Communications</h2>
        {communications.length === 0 ? (
          <EmptyState
            iconName="MessageSquare"
            headline="No communications yet"
            subtext="Emails and SMS sent to this customer will appear here."
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="max-h-64 overflow-y-auto">
              {communications.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-3 border-b px-4 py-3 last:border-0"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {c.channel === 'email' ? (
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                  ) : (
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                      {c.channel}
                    </span>
                    <span className="mx-1.5" style={{ color: 'var(--text-3)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {c.direction === 'out' ? 'Outbound' : 'Inbound'}
                    </span>
                    <span className="mx-1.5" style={{ color: 'var(--text-3)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                    {c.body && (
                      <p className="mt-1 truncate text-sm" style={{ color: 'var(--text-2)' }}>
                        {c.body}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Invoices */}
      <section>
        <h2 className="section-label mb-3">Invoices</h2>
        {invoices.length === 0 ? (
          <EmptyState
            iconName="FileText"
            headline="No invoices"
            subtext="Invoices sent to this customer will appear here."
            ctaLabel="Send Invoice"
            ctaHref={`/invoices?customer=${customer.id}`}
          />
        ) : (
          <ul className="space-y-2">
            {invoices.slice(0, 5).map((inv) => (
              <li key={inv.id}>
                <Card className="p-4">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-1)' }}>
                      ${Number(inv.amount_total).toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--text-3)' }}>
                      {inv.status}
                      {inv.due_date &&
                        ` · Due ${new Date(inv.due_date).toLocaleDateString()}`}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
