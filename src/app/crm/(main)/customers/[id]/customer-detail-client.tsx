'use client'

import { useState } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { useRouter } from 'next/navigation'
import { Car, ClipboardList, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { VehicleForm } from '@/app/crm/(main)/customers/[id]/vehicle-form'
import type { Vehicle, Job, Invoice } from '@/types/database'

interface JobRow {
  id: string
  scheduled_at: string
  status: string
  address: string
  services: { name: string } | { name: string }[] | null
}

interface InvoiceRow {
  id: string
  status: string
  amount_total: number
  due_date: string | null
  created_at: string
}

interface CustomerDetailClientProps {
  customerId: string
  initialVehicles: Vehicle[]
  initialJobs: JobRow[]
  initialInvoices: InvoiceRow[]
}

export function CustomerDetailClient({
  customerId,
  initialVehicles,
  initialJobs,
  initialInvoices,
}: CustomerDetailClientProps) {
  const router = useRouter()
  const [addVehicleOpen, setAddVehicleOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-[var(--text)] flex items-center gap-2">
            <Car className="h-5 w-5 text-[var(--accent)]" />
            Vehicles
          </h2>
          <Button variant="outline" size="sm" onClick={() => setAddVehicleOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {initialVehicles.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4">No vehicles. Add one to track detailing history.</p>
        ) : (
          <ul className="space-y-2">
            {initialVehicles.map((v) => (
              <li
                key={v.id}
                role="button"
                tabIndex={0}
                onClick={() => setEditVehicle(v)}
                onKeyDown={(e) => e.key === 'Enter' && setEditVehicle(v)}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 cursor-pointer hover:bg-white/[0.06] transition-colors"
              >
                <div>
                  <p className="font-medium text-[var(--text)]">
                    {v.year ? `${v.year} ` : ''}{v.make} {v.model}
                    {v.color ? ` · ${v.color}` : ''}
                  </p>
                  {v.notes && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-[240px]">{v.notes}</p>
                  )}
                </div>
                <span className="text-sm text-[var(--accent)] font-medium">Edit</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setAddVehicleOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Add vehicle</DialogTitle>
          </DialogHeader>
          <VehicleForm
            customerId={customerId}
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
              customerId={customerId}
              vehicle={editVehicle}
              onSuccess={() => { setEditVehicle(null); router.refresh() }}
              onCancel={() => setEditVehicle(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-[var(--text)] flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
            Recent jobs
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={crmPath(`/jobs?new=1&customer=${customerId}`)}>New job</Link>
          </Button>
        </div>
        {initialJobs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4">No jobs yet.</p>
        ) : (
          <ul className="space-y-2">
            {initialJobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={crmPath(`/jobs/${job.id}`)}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">
                      {Array.isArray(job.services) ? job.services[0]?.name : job.services?.name ?? 'Service'} · {new Date(job.scheduled_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{job.status}</p>
                  </div>
                  <span className="text-xs text-[var(--accent)] font-medium">View</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:col-span-2 card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-[var(--text)] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--accent)]" />
            Invoices
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={crmPath(`/invoices?customer=${customerId}`)}>Send invoice</Link>
          </Button>
        </div>
        {initialInvoices.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4">No invoices yet.</p>
        ) : (
          <ul className="space-y-2">
            {initialInvoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white/[0.03] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    ${Number(inv.amount_total).toLocaleString()} · {inv.status}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link href={crmPath('/invoices')} className="text-sm text-[var(--accent)] hover:opacity-90 font-medium">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
