'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import {
  MapPin,
  User,
  Car,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Trash2,
  Pencil,
  Phone,
  MessageSquare,
  Mail,
  Check,
} from 'lucide-react'
import { JobWorkflowSwipe } from '@/components/job-workflow-swipe'
import { AddressMap } from '@/components/address-map'

interface ChecklistItemRow {
  id: string
  job_id: string
  label: string
  checked: boolean
  sort_order: number
}

interface JobDetailPopupProps {
  open: boolean
  jobId: string | null
  onClose: () => void
  onDeleted?: () => void
  onUpdated?: () => void
  /** Schedule only: open edit modal with this job id. Pass jobData to avoid re-fetch (fixes "Job not found"). */
  onOpenEdit?: (jobId: string, jobData?: JobData | null) => void
  /** When opening from schedule, pass the job row we already have so we can show it immediately and avoid "Job not found" if fetch fails. */
  initialJobData?: Partial<JobData> | null
}

type JobData = {
  id: string
  customer_id: string
  vehicle_id: string | null
  service_id: string | null
  scheduled_at: string
  address: string
  status: string
  notes: string | null
  paid_at?: string | null
  actual_started_at?: string | null
  actual_ended_at?: string | null
  clients: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    stripe_customer_id?: string | null
  } | null
  org_id?: string | null
  vehicles: {
    id: string
    make: string
    model: string
    year: number | null
    color: string | null
  } | {
    id: string
    make: string
    model: string
    year: number | null
    color: string | null
  }[] | null
  services: {
    id: string
    name: string
    duration_mins: number
    base_price?: number | null
  } | null
  base_price?: number | null
  size_price_offset?: number | null
  discount_amount?: number | null
  job_upsells?: { price: number }[]
  /** Popup-only: when we have job_services, summary for display (e.g. 2× same service) */
  servicesSummary?: { name: string; count: number; duration_mins?: number }[]
}

export function JobDetailPopup({
  open,
  jobId,
  onClose,
  onDeleted,
  onUpdated,
  onOpenEdit,
  initialJobData,
}: JobDetailPopupProps) {
  const [job, setJob] = useState<JobData | null>(null)
  const [photos, setPhotos] = useState<{ id: string; url: string; type: string }[]>([])
  const [checklist, setChecklist] = useState<ChecklistItemRow[]>([])
  const [payments, setPayments] = useState<{ id: string; amount: number; method: string; reference: string | null; created_at: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'choose' | 'record'>('choose')
  const [recordMethod, setRecordMethod] = useState<'cash' | 'etransfer' | 'cheque'>('cash')
  const [recordAmount, setRecordAmount] = useState('')
  const [recordReference, setRecordReference] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [checklistModalOpen, setChecklistModalOpen] = useState(false)
  const [completingStatus, setCompletingStatus] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [orgPayment, setOrgPayment] = useState<{ stripe_account_id: string | null; subscription_plan: string | null; booking_payment_mode: string | null } | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [tipPreset, setTipPreset] = useState<0 | 10 | 15 | 20 | 25 | 'custom'>(0)
  const [customTipDollars, setCustomTipDollars] = useState('')

  const fetchJob = useCallback(async () => {
    if (!open || !jobId) return
    setLoading(true)
    const supabase = createClient()
    const { data: jobRow, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(id, name, email, phone, address, stripe_customer_id),
        job_upsells(price)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !jobRow) {
      if (initialJobData && initialJobData.id === jobId) {
        setJob(initialJobData as JobData)
      } else {
        setJob(null)
      }
      setLoading(false)
      return
    }

    const vehicleId = (jobRow as { vehicle_id?: string | null }).vehicle_id
    const serviceId = (jobRow as { service_id?: string | null }).service_id
    const { data: jobVehiclesRows } = await supabase.from('job_vehicles').select('vehicle_id').eq('job_id', jobId)
    const { data: jobServicesRows } = await supabase.from('job_services').select('service_id').eq('job_id', jobId)
    const vehicleIds = (jobVehiclesRows ?? []).map((r: { vehicle_id: string }) => r.vehicle_id)
    const idsToFetch = vehicleIds.length > 0 ? vehicleIds : (vehicleId ? [vehicleId] : [])
    const serviceIdsFromJob = (jobServicesRows ?? []).map((r: { service_id: string }) => r.service_id)
    const uniqueServiceIds = [...new Set(serviceIdsFromJob.length > 0 ? serviceIdsFromJob : (serviceId ? [serviceId] : []))]
    const [vehicleRes, servicesListRes, photosRes, checklistRes, paymentsRes] = await Promise.all([
      idsToFetch.length > 0
        ? supabase.from('vehicles').select('id, make, model, year, color').in('id', idsToFetch)
        : { data: null },
      uniqueServiceIds.length > 0 ? supabase.from('services').select('id, name, duration_mins, base_price').in('id', uniqueServiceIds) : { data: [] },
      supabase.from('job_photos').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
      supabase.from('job_checklist_items').select('*').eq('job_id', jobId).order('sort_order'),
      supabase.from('job_payments').select('*').eq('job_id', jobId).order('created_at', { ascending: false }),
    ])
    const vehicleList = vehicleRes?.data ?? []
    const vehiclesNormalized =
      vehicleList.length === 0
        ? null
        : vehicleList.length === 1
          ? vehicleList[0]
          : idsToFetch.map((id) => vehicleList.find((v) => v.id === id)).filter(Boolean) as typeof vehicleList

    const servicesList = (servicesListRes?.data ?? []) as { id: string; name: string; duration_mins?: number; base_price?: number }[]
    const serviceCountById: Record<string, number> = {}
    serviceIdsFromJob.forEach((sid) => { serviceCountById[sid] = (serviceCountById[sid] ?? 0) + 1 })
    const servicesSummary: { name: string; count: number; duration_mins?: number }[] =
      servicesList.length > 0
        ? servicesList.map((s) => ({ name: s.name, count: serviceCountById[s.id] ?? 1, duration_mins: s.duration_mins }))
        : []

    const clientsNorm = Array.isArray(jobRow.clients) ? jobRow.clients[0] ?? null : jobRow.clients
    const upsellsNorm = Array.isArray((jobRow as { job_upsells?: unknown }).job_upsells)
      ? ((jobRow as { job_upsells: { price: number }[] }).job_upsells)
      : []
    const singleService = servicesList.length === 1 && (serviceCountById[servicesList[0].id] ?? 0) <= 1 ? servicesList[0] : null
    const normalized: JobData = {
      ...jobRow,
      clients: clientsNorm as JobData['clients'],
      vehicles: vehiclesNormalized,
      services: singleService ?? (servicesList[0] ?? null),
      job_upsells: upsellsNorm,
      servicesSummary: servicesSummary.length > 0 ? servicesSummary : undefined,
    }

    setJob(normalized)
    setNotes(normalized.notes ?? '')
    setPhotos(photosRes.data ?? [])
    setChecklist(checklistRes.data ?? [])
    setPayments(paymentsRes.data ?? [])
    const orgId = (jobRow as { org_id?: string }).org_id
    if (orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_account_id, subscription_plan, booking_payment_mode')
        .eq('id', orgId)
        .single()
      setOrgPayment(org ?? null)
    } else {
      setOrgPayment(null)
    }
    setLoading(false)
  }, [open, jobId])

  useEffect(() => {
    if (open && jobId) {
      if (initialJobData && initialJobData.id === jobId) {
        setJob(initialJobData as JobData)
      } else {
        setJob(null)
      }
    } else {
      setJob(null)
    }
    fetchJob()
  }, [fetchJob, open, jobId])

  /** Refetch popup data only; do not call onUpdated (router.refresh would unmount parent and close popup). */
  const refresh = useCallback(() => {
    fetchJob()
  }, [fetchJob])

  const client = job?.clients ?? null
  const vehiclesList = job?.vehicles
    ? Array.isArray(job.vehicles)
      ? job.vehicles
      : [job.vehicles]
    : []
  const vehicle = vehiclesList[0] ?? null
  const service = job?.services ?? null
  const clientId = client?.id
  const serviceName = service?.name ?? '—'
  const serviceBasePrice = typeof job?.base_price === 'number' ? job.base_price : (service?.base_price ?? 0)
  const servicePrice = service?.base_price ?? 0
  const sizeOffset = typeof job?.size_price_offset === 'number' ? job.size_price_offset : 0
  const discount = typeof job?.discount_amount === 'number' ? job.discount_amount : 0
  const upsellTotal = Array.isArray(job?.job_upsells) ? job.job_upsells.reduce((s, u) => s + Number(u.price), 0) : 0
  const expectedPrice = serviceBasePrice + sizeOffset + upsellTotal
  const jobTotal = Math.max(0, expectedPrice - discount)
  const serviceDuration = service?.duration_mins ?? 0
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const directionsUrl = job
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`
    : ''

  async function updateStatus(newStatus: 'en_route' | 'in_progress' | 'done') {
    if (!job) return
    if (newStatus === 'done') {
      setChecklistModalOpen(true)
      return
    }
    const supabase = createClient()
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'in_progress') updates.actual_started_at = new Date().toISOString()
    await supabase.from('jobs').update(updates).eq('id', job.id)
    setJob((prev) => (prev ? { ...prev, status: newStatus } : null))
    refresh()
  }

  async function confirmComplete() {
    if (!job) return
    setCompletingStatus(true)
    const supabase = createClient()
    await supabase
      .from('jobs')
      .update({ status: 'done', actual_ended_at: new Date().toISOString() })
      .eq('id', job.id)
    setJob((prev) => (prev ? { ...prev, status: 'done' } : null))
    setChecklistModalOpen(false)
    setCompletingStatus(false)
    refresh()
  }

  async function saveNotes() {
    if (!job) return
    setSavingNotes(true)
    const supabase = createClient()
    await supabase.from('jobs').update({ notes }).eq('id', job.id)
    setJob((prev) => (prev ? { ...prev, notes } : null))
    setSavingNotes(false)
    refresh()
  }

  async function toggleChecklistItem(itemId: string, checked: boolean) {
    const supabase = createClient()
    await supabase.from('job_checklist_items').update({ checked }).eq('id', itemId)
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked } : i)))
    refresh()
  }

  async function recordPayment() {
    if (!job) return
    if (payments.length > 0) return
    const amount = Number(recordAmount)
    if (!amount || amount <= 0) return
    setRecordingPayment(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('job_payments')
      .insert([{ job_id: job.id, amount, method: recordMethod, reference: recordReference.trim() || null, created_by: user?.id }])
      .select()
      .single()
    if (error) {
      setRecordingPayment(false)
      return
    }
    const now = new Date().toISOString()
    await supabase
      .from('jobs')
      .update({ status: 'done', paid_at: now, updated_at: now })
      .eq('id', job.id)
    setRecordingPayment(false)
    if (data) {
      setPayments((prev) => [data, ...prev])
      setJob((prev) => (prev ? { ...prev, status: 'done', paid_at: now } : null))
      setPaymentModalOpen(false)
      setPaymentStep('choose')
      setRecordAmount('')
      setRecordReference('')
      refresh()
      onUpdated?.()
      fetch(`/api/jobs/${job.id}/send-review-request`, { method: 'POST' }).catch(() => {})
    }
  }

  async function handleDelete() {
    if (!job) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('jobs').delete().eq('id', job.id)
    setDeleting(false)
    setDeleteConfirmOpen(false)
    onDeleted?.()
    onClose()
  }

  if (!open) return null

  const content = (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-md:max-w-none max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none max-h-[90dvh] w-full max-w-lg flex flex-col p-0 gap-0">
          <DialogClose onClick={onClose} />
          <DialogHeader>
            <div className="px-4 pt-4 pb-2 shrink-0 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 min-w-0">
                <DialogTitle className="text-lg font-semibold text-white truncate min-w-0">
                  {loading ? 'Loading…' : client?.name ?? 'Job'}
                </DialogTitle>
                {onOpenEdit && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOpenEdit(jobId!, job)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : job ? (
              <>
                {/* Customer */}
                <section>
                  <p className="section-label mb-2 text-xs text-[var(--text-muted)]">Customer</p>
                  <p className="font-medium text-white">{client?.name ?? '—'}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {client?.phone && (
                      <>
                        <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                        <a href={`sms:${client.phone}`} className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
                          <MessageSquare className="h-3.5 w-3.5" /> Text
                        </a>
                      </>
                    )}
                    {client?.email && (
                      <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                    )}
                  </div>
                  {clientId && (
                    <Link href={crmPath(`/customers/${clientId}`)} className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
                      View customer →
                    </Link>
                  )}
                </section>

                {/* Time */}
                <section>
                  <p className="section-label mb-2 text-xs text-[var(--text-muted)]">Time</p>
                  {(() => {
                    const start = new Date(job.scheduled_at)
                    const end = new Date(start.getTime() + (serviceDuration || 60) * 60 * 1000)
                    return (
                      <p className="text-sm text-[var(--text-secondary)]">
                        {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )
                  })()}
                </section>

                {/* Vehicle */}
                <section>
                  <p className="section-label mb-2 text-xs text-[var(--text-muted)]">
                    {vehiclesList.length > 1 ? `Vehicles (${vehiclesList.length})` : 'Vehicle'}
                  </p>
                  {vehiclesList.length > 0 ? (
                    <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                      {vehiclesList.map((v) => (
                        <li key={v.id}>
                          {`${v.year ?? ''} ${v.make} ${v.model}${v.color ? ` · ${v.color}` : ''}`.trim() || '—'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">—</p>
                  )}
                </section>

                {/* Location */}
                <section>
                  <p className="section-label mb-2 text-xs text-[var(--text-muted)]">Location</p>
                  <p className="text-sm text-[var(--text-secondary)]">{job.address}</p>
                  <AddressMap address={job.address} className="mt-2" />
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Navigate with directions
                  </a>
                </section>

                {/* Service */}
                <section>
                  <p className="section-label mb-2 text-xs text-[var(--text-muted)]">
                    {job.servicesSummary && (job.servicesSummary.length > 1 || job.servicesSummary.some((s) => s.count > 1)) ? 'Services' : 'Service'}
                  </p>
                  {job.servicesSummary && job.servicesSummary.length > 0 ? (
                    <>
                      <ul className="text-sm font-medium text-white space-y-1">
                        {job.servicesSummary.map((s, i) => (
                          <li key={i}>{s.count > 1 ? `${s.count}× ${s.name}` : s.name}</li>
                        ))}
                      </ul>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Expected total: ${expectedPrice.toLocaleString()}
                        {job.servicesSummary.some((s) => s.duration_mins != null) && (
                          <> · {job.servicesSummary.reduce((sum, s) => sum + (s.duration_mins ?? 0) * (s.count ?? 1), 0)} min</>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-white">{serviceName}</p>
                      <p className="text-sm text-[var(--text-secondary)]">${servicePrice.toLocaleString()} · {serviceDuration} min</p>
                    </>
                  )}
                </section>

                {/* Notes */}
                <section>
                  <p className="section-label mb-2 text-xs text-[var(--text-muted)]">Notes</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Job notes..."
                    className="min-h-[80px] border-white/10 bg-[var(--surface-1)] text-sm"
                  />
                  {savingNotes && <span className="text-xs text-[var(--text-muted)]">Saving…</span>}
                </section>

                {/* Amount / Payment total */}
                <section>
                  <p className="section-label mb-2 text-xs text-[var(--text-muted)]">Payment</p>
                  {(payments.length > 0 || job.paid_at) && (
                    <p className="text-sm font-medium text-green-400 flex items-center gap-1 mb-1">
                      <Check className="h-4 w-4" />
                      Completed and paid
                    </p>
                  )}
                  <p className="text-sm text-[var(--text-secondary)]">Expected: ${expectedPrice.toLocaleString()}</p>
                  <p className="text-sm font-medium text-white">Total paid: ${totalPaid.toLocaleString()}</p>
                </section>

                {/* Workflow swipe */}
                <section style={{ touchAction: 'none' }}>
                  <JobWorkflowSwipe
                    status={job.status}
                    onStatusChange={updateStatus}
                    onRequestComplete={() => setChecklistModalOpen(true)}
                    checklistOpen={checklistModalOpen}
                    onPaymentClick={() => {
                      if (payments.length === 0 && !job.paid_at) setPaymentModalOpen(true)
                    }}
                    isPaid={payments.length > 0 || !!job.paid_at}
                  />
                </section>

                {/* Payment actions */}
                <section>
                  {(payments.length > 0 || job.paid_at) ? (
                    <ul className="space-y-1">
                      {payments.map((p) => (
                        <li key={p.id} className="flex justify-between text-sm">
                          <span className="text-white">${Number(p.amount).toLocaleString()} · {p.method}</span>
                          <span className="text-[var(--text-muted)]">{new Date(p.created_at).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setPaymentModalOpen(true)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Send invoice or record payment
                      </Button>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">One payment per job. Job will be marked completed when paid.</p>
                    </>
                  )}
                </section>

                {/* Delete */}
                <section className="pt-2 border-t border-[var(--border)]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete job
                  </Button>
                </section>
              </>
            ) : (
              <p className="py-8 text-center text-[var(--text-muted)]">Job not found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist modal (Complete step) – z-[100] so it appears above job popup */}
      <Dialog open={checklistModalOpen} onOpenChange={setChecklistModalOpen} className="z-[100]">
        <DialogContent className="max-w-md max-h-[90dvh] flex flex-col">
          <DialogClose onClick={() => setChecklistModalOpen(false)} />
          <DialogHeader>
            <DialogTitle>Complete job · Checklist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">Review the checklist below, then confirm completion. Payment is only available after you mark the job complete.</p>
          {checklist.length > 0 ? (
            <ul className="my-4 space-y-2 flex-1 overflow-y-auto min-h-0">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-[var(--surface-1)] text-[var(--accent)]"
                  />
                  <span className={item.checked ? 'text-[var(--text-muted)] line-through' : ''}>{item.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="my-4 text-sm text-[var(--text-muted)]">No checklist items. You can add them in the job detail or in Settings. Tap &quot;Mark complete&quot; to finish the job.</p>
          )}
          <div className="flex justify-end gap-2 pt-4 shrink-0">
            <Button variant="outline" onClick={() => setChecklistModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmComplete} disabled={completingStatus}>
              {completingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark complete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment modal */}
      <Dialog
        open={paymentModalOpen}
        onOpenChange={(o) => { setPaymentModalOpen(o); if (!o) setPaymentStep('choose'); }}
      >
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => { setPaymentModalOpen(false); setPaymentStep('choose'); }} />
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          {paymentStep === 'choose' ? (
            <div className="space-y-2">
              {client?.stripe_customer_id && orgPayment?.stripe_account_id && orgPayment?.subscription_plan === 'pro' && (orgPayment?.booking_payment_mode === 'card_on_file' || orgPayment?.booking_payment_mode === 'deposit') ? (
                <>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Add tip (optional)</p>
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">Job total: ${jobTotal.toLocaleString()}</p>
                  {totalPaid > 0 && (
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      Already paid: ${totalPaid.toLocaleString()}
                      {totalPaid < jobTotal && (
                        <span className="ml-1 font-medium text-[var(--text-secondary)]"> · Balance due: ${(jobTotal - totalPaid).toLocaleString()}</span>
                      )}
                    </p>
                  )}
                  {totalPaid === 0 && <div className="mb-2" />}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {([0, 10, 15, 20, 25] as const).map((pct) => {
                      const tipDollars = pct === 0 ? 0 : Math.round(jobTotal * (pct / 100) * 100) / 100
                      return (
                        <div key={pct} className="flex flex-col items-center">
                          <Button
                            type="button"
                            variant={tipPreset === pct ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setTipPreset(pct); setCustomTipDollars(''); }}
                          >
                            {pct === 0 ? 'No tip' : `${pct}%`}
                          </Button>
                          {pct > 0 && (
                            <span className="text-[10px] text-[var(--text-muted)] mt-0.5">(${tipDollars.toLocaleString()})</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-[var(--text-muted)]">Custom:</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={customTipDollars}
                      onChange={(e) => {
                        setCustomTipDollars(e.target.value)
                        if (e.target.value.trim() !== '') setTipPreset('custom')
                      }}
                      className="h-8 w-24 border-white/10 bg-[var(--surface-1)] text-sm"
                    />
                    <span className="text-xs text-[var(--text-muted)]">$</span>
                  </div>
                  <Button
                    className="w-full justify-start"
                    size="lg"
                    onClick={async () => {
                      if (!job?.id) return
                      setCheckoutLoading(true)
                      try {
                        const body = tipPreset === 'custom'
                          ? { tipCents: Math.min(10000, Math.max(0, Math.round((parseFloat(customTipDollars) || 0) * 100))) }
                          : { tipPercent: tipPreset }
                        const res = await fetch(`/api/jobs/${job.id}/checkout-session`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(body),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok && data.url) {
                          setPaymentModalOpen(false)
                          setTipPreset(0)
                          setCustomTipDollars('')
                          window.location.href = data.url
                        } else {
                          alert(data.error ?? 'Could not open payment page')
                        }
                      } finally {
                        setCheckoutLoading(false)
                      }
                    }}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                    {tipPreset === 'custom' && customTipDollars.trim() !== ''
                      ? `Collect payment (+ $${Number(customTipDollars).toLocaleString()} tip)`
                      : typeof tipPreset === 'number' && tipPreset > 0
                        ? `Collect payment (+ ${tipPreset}% tip $${(Math.round(Number(jobTotal) * (tipPreset / 100) * 100) / 100).toLocaleString()})`
                        : 'Collect payment (saved card)'}
                  </Button>
                </>
              ) : null}
              <Button className="w-full justify-start" variant="outline" size="lg" asChild>
                <a href={crmPath(`/invoices?customer=${clientId ?? ''}&job=${job?.id ?? ''}`)} onClick={() => setPaymentModalOpen(false)}>
                  <FileText className="mr-2 h-4 w-4" /> Send Invoice via Stripe
                </a>
              </Button>
              {(['cash', 'etransfer', 'cheque'] as const).map((method) => (
                <Button
                  key={method}
                  className="w-full justify-start"
                  variant="outline"
                  size="lg"
                  onClick={() => { setRecordMethod(method); setPaymentStep('record'); }}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {method === 'etransfer' ? 'E-Transfer' : method === 'cheque' ? 'Cheque' : 'Cash'}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">Record {recordMethod} payment</p>
              <div>
                <Label htmlFor="popup-pay-amount">Amount ($)</Label>
                <Input
                  id="popup-pay-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  className="border-white/10 bg-[var(--surface-1)]"
                />
              </div>
              <div>
                <Label htmlFor="popup-pay-ref">Reference (optional)</Label>
                <Input
                  id="popup-pay-ref"
                  value={recordReference}
                  onChange={(e) => setRecordReference(e.target.value)}
                  placeholder="Check number, etc."
                  className="border-white/10 bg-[var(--surface-1)]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentStep('choose')}>Back</Button>
                <Button
                  onClick={recordPayment}
                  disabled={recordingPayment || !recordAmount || Number(recordAmount) <= 0}
                >
                  {recordingPayment ? 'Saving...' : 'Record'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDeleteConfirmOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete job?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
  return createPortal(content, document.body)
}
