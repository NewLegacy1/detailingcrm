'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MapPin,
  Camera,
  RefreshCw,
  Loader2,
  ListChecks,
  Plus,
  DollarSign,
  FileText,
  User,
  Car,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  Trash2,
  Check,
} from 'lucide-react'
import { JobWorkflowSwipe } from '@/components/job-workflow-swipe'
import { AddressMap } from '@/components/address-map'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import type { JobPhoto } from '@/types/database'

interface ChecklistItemRow {
  id: string
  job_id: string
  label: string
  checked: boolean
  sort_order: number
}

type GoogleSyncStatus = 'pending' | 'synced' | 'failed'

interface JobDetailClientProps {
  job: {
    id: string
    scheduled_at: string
    status: string
    address: string
    notes: string | null
    paid_at?: string | null
    google_sync_status?: GoogleSyncStatus | null
    google_last_sync_error?: string | null
    clients: {
      id: string
      name: string
      email: string | null
      phone: string | null
      address: string | null
    } | null
    vehicles: {
      id: string
      make: string
      model: string
      year: number | null
      color: string | null
    } | null
    services: {
      id: string
      name: string
      duration_mins: number
      base_price?: number | null
    } | null
  }
  photos: JobPhoto[]
  checklistItems: ChecklistItemRow[]
  jobPayments: {
    id: string
    amount: number
    method: string
    reference: string | null
    created_at: string
  }[]
}

export function JobDetailClient({
  job: initialJob,
  photos: initialPhotos,
  checklistItems: initialChecklist,
  jobPayments: initialPayments,
}: JobDetailClientProps) {
  const router = useRouter()
  const [job, setJob] = useState(initialJob)
  const [photos, setPhotos] = useState(initialPhotos)
  const [checklist, setChecklist] = useState<ChecklistItemRow[]>(initialChecklist)
  const [payments, setPayments] = useState(initialPayments)
  const [notes, setNotes] = useState(initialJob.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [retrySyncLoading, setRetrySyncLoading] = useState(false)
  const [newChecklistLabel, setNewChecklistLabel] = useState('')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'choose' | 'record'>('choose')
  const [recordMethod, setRecordMethod] = useState<
    'cash' | 'etransfer' | 'cheque'
  >('cash')
  const [recordAmount, setRecordAmount] = useState('')
  const [recordReference, setRecordReference] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [checklistModalOpen, setChecklistModalOpen] = useState(false)
  const [completingStatus, setCompletingStatus] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const googleSyncStatus = (job.google_sync_status ?? 'pending') as GoogleSyncStatus

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`
  const client = Array.isArray(job.clients) ? job.clients[0] ?? null : job.clients
  const vehicle = Array.isArray(job.vehicles) ? job.vehicles[0] ?? null : job.vehicles
  const service = Array.isArray(job.services) ? job.services[0] ?? null : job.services
  const clientId = client?.id
  const serviceName = service?.name ?? 'Job'
  const servicePrice = service?.base_price ?? 0
  const serviceDuration = service?.duration_mins ?? 0

  function triggerGoogleSync() {
    fetch(`/api/integrations/google/sync/job/${job.id}`, { method: 'POST' }).catch(
      () => {}
    )
  }

  async function updateStatus(newStatus: string) {
    if (newStatus === 'done') {
      setChecklistModalOpen(true)
      return
    }
    const supabase = createClient()
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'in_progress')
      updates.actual_started_at = new Date().toISOString()
    if (newStatus === 'done') updates.actual_ended_at = new Date().toISOString()
    await supabase.from('jobs').update(updates).eq('id', job.id)
    setJob((prev) => ({ ...prev, status: newStatus }))
    triggerGoogleSync()
    router.refresh()
  }

  async function confirmComplete() {
    setCompletingStatus(true)
    const supabase = createClient()
    await supabase
      .from('jobs')
      .update({
        status: 'done',
        actual_ended_at: new Date().toISOString(),
      })
      .eq('id', job.id)
    setJob((prev) => ({ ...prev, status: 'done' }))
    setChecklistModalOpen(false)
    setCompletingStatus(false)
    triggerGoogleSync()
    router.refresh()
  }

  async function saveNotes() {
    setSavingNotes(true)
    const supabase = createClient()
    await supabase.from('jobs').update({ notes }).eq('id', job.id)
    setJob((prev) => ({ ...prev, notes }))
    setSavingNotes(false)
    triggerGoogleSync()
    router.refresh()
  }

  async function retryGoogleSync() {
    setRetrySyncLoading(true)
    try {
      const res = await fetch('/api/integrations/google/sync/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      })
      if (res.ok) router.refresh()
    } finally {
      setRetrySyncLoading(false)
    }
  }

  async function handlePhotoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after'
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const path = `${job.id}/${type}-${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-photos')
      .upload(path, file, { upsert: false })
    if (uploadError) {
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage
      .from('job-photos')
      .getPublicUrl(uploadData.path)
    const { data: photoRow } = await supabase
      .from('job_photos')
      .insert([{ job_id: job.id, url: urlData.publicUrl, type }])
      .select()
      .single()
    if (photoRow) setPhotos((prev) => [...prev, photoRow])
    setUploading(false)
    router.refresh()
    e.target.value = ''
  }

  async function toggleChecklistItem(itemId: string, checked: boolean) {
    const supabase = createClient()
    await supabase
      .from('job_checklist_items')
      .update({ checked })
      .eq('id', itemId)
    setChecklist((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, checked } : i))
    )
    router.refresh()
  }

  async function addChecklistItem() {
    const label = newChecklistLabel.trim()
    if (!label) return
    const supabase = createClient()
    const { data } = await supabase
      .from('job_checklist_items')
      .insert([
        { job_id: job.id, label, sort_order: checklist.length, checked: false },
      ])
      .select()
      .single()
    if (data) {
      setChecklist((prev) => [...prev, data])
      setNewChecklistLabel('')
      router.refresh()
    }
  }

  async function recordPayment() {
    const amount = Number(recordAmount)
    if (!amount || amount <= 0) return
    if (payments.length > 0) {
      setRecordError('This job has already been paid. Only one payment per job.')
      return
    }
    setRecordError(null)
    setRecordingPayment(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('job_payments')
      .insert([
        {
          job_id: job.id,
          amount,
          method: recordMethod,
          reference: recordReference.trim() || null,
          created_by: user?.id,
        },
      ])
      .select()
      .single()
    if (error) {
      setRecordingPayment(false)
      setRecordError(error.message || 'Failed to record payment')
      return
    }
    const now = new Date().toISOString()
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({ status: 'done', paid_at: now, updated_at: now })
      .eq('id', job.id)
    setRecordingPayment(false)
    if (data) {
      setPayments((prev) => [data, ...prev])
      setJob((j) => (j ? { ...j, status: 'done', paid_at: now } : j))
      setPaymentModalOpen(false)
      setPaymentStep('choose')
      setRecordAmount('')
      setRecordReference('')
      setRecordError(null)
      router.refresh()
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('jobs').delete().eq('id', job.id)
    setDeleting(false)
    setDeleteConfirmOpen(false)
    router.push(crmPath('/jobs'))
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
              <User className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-secondary)]">
            <p className="font-medium text-white">{client?.name ?? '—'}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {client?.phone && (
                <>
                  <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <a href={`sms:${client.phone}`} className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline">
                    <MessageSquare className="h-3.5 w-3.5" /> Text
                  </a>
                </>
              )}
              {client?.email && (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline">
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
              )}
            </div>
            <Link
              href={crmPath(`/customers/${clientId}`)}
              className="mt-2 inline-block text-[var(--accent)] hover:underline"
            >
              View customer →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
              <Car className="h-4 w-4" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-secondary)]">
            {vehicle ? (
              <p>
                {vehicle.year ? `${vehicle.year} ` : ''}
                {vehicle.make} {vehicle.model}
                {vehicle.color ? ` · ${vehicle.color}` : ''}
              </p>
            ) : (
              <p>—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-secondary)]">
            <p>{job.address}</p>
            <AddressMap address={job.address} className="mt-2" />
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              Navigate with directions
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
              <Clock className="h-4 w-4" />
              Service
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-secondary)]">
            <p className="font-medium text-white">{serviceName}</p>
            <p>${servicePrice.toLocaleString()}</p>
            <p>{serviceDuration} min</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-white">
            Action
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {googleSyncStatus === 'failed' && (
        <div className="card flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-xs font-medium text-amber-400">Google sync failed</span>
          {job.google_last_sync_error && (
            <span
              className="max-w-[200px] truncate text-xs text-[var(--text-muted)]"
              title={job.google_last_sync_error}
            >
              {job.google_last_sync_error}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={retryGoogleSync}
            disabled={retrySyncLoading}
          >
            {retrySyncLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}{' '}
            Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[var(--surface-1)] px-4 py-2 text-sm hover:bg-white/5">
              <Camera className="h-4 w-4" />
              Add before
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handlePhotoUpload(e, 'before')}
              />
            </Label>
            <Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[var(--surface-1)] px-4 py-2 text-sm hover:bg-white/5">
              <Camera className="h-4 w-4" />
              Add after
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handlePhotoUpload(e, 'after')}
              />
            </Label>
          </div>
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-lg border border-white/10 bg-[var(--surface-1)]"
                >
                  <img
                    src={photo.url}
                    alt={photo.type}
                    className="h-full w-full object-cover"
                  />
                  <span className="block px-2 py-1 text-xs text-[var(--text-muted)]">
                    {photo.type}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-[var(--text-muted)]">No photos yet.</p>
          )}
        </CardContent>
      </Card>

      {(job.status === 'in_progress' || job.status === 'done' || checklist.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
              <ListChecks className="h-5 w-5" />
              Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checklist.length === 0 ? (
              <p className="mb-4 text-sm text-[var(--text-muted)]">
                No checklist items. Add one below or set defaults in Settings → Checklist.
              </p>
            ) : (
              <ul className="mb-4 space-y-2">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        toggleChecklistItem(item.id, e.target.checked)
                      }
                      className="h-4 w-4 rounded border-white/10 bg-[var(--surface-1)] text-[var(--accent)]"
                    />
                    <span
                      className={
                        item.checked
                          ? 'text-[var(--text-muted)] line-through'
                          : 'text-white'
                      }
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add item..."
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addChecklistItem())
                }
                className="max-w-xs border-white/10 bg-[var(--surface-1)]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
                disabled={!newChecklistLabel.trim()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <DollarSign className="h-5 w-5" />
            Payment
            {(payments.length > 0 || job.paid_at) && (
              <span className="inline-flex items-center gap-1 rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                <Check className="h-3.5 w-3.5" />
                Paid
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(payments.length > 0 || job.paid_at) ? (
            <>
              <p className="text-sm text-[var(--text-secondary)]">Completed and paid</p>
              <ul className="mt-4 space-y-2">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-0"
                  >
                    <span className="text-white">
                      ${Number(p.amount).toLocaleString()} · {p.method}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => { setRecordError(null); setPaymentModalOpen(true); }}>
                Record or send payment
              </Button>
              <p className="mt-2 text-xs text-[var(--text-muted)]">One payment per job. Job will be marked completed when paid.</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-white">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Job notes..."
            className="min-h-[100px] border-white/10 bg-[var(--surface-1)]"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">Saved on blur</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-white">Delete job</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 border-red-400/30 hover:bg-red-500/10"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete job
          </Button>
        </CardContent>
      </Card>

      <Dialog open={checklistModalOpen} onOpenChange={setChecklistModalOpen} className="z-[100]">
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setChecklistModalOpen(false)} />
          <DialogHeader>
            <DialogTitle>Complete job · Checklist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            Review the checklist below, then confirm completion. Payment is only available after you mark the job complete.
          </p>
          {checklist.length > 0 ? (
            <ul className="my-4 space-y-2">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) =>
                      toggleChecklistItem(item.id, e.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/10 bg-[var(--surface-1)] text-[var(--accent)]"
                  />
                  <span
                    className={
                      item.checked ? 'text-[var(--text-muted)] line-through' : ''
                    }
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="my-4 text-sm text-[var(--text-muted)]">
              No checklist items. You can add them in the job detail or in Settings.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setChecklistModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmComplete} disabled={completingStatus}>
              {completingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Mark complete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paymentModalOpen}
        onOpenChange={(open) => {
          setPaymentModalOpen(open)
          if (!open) setPaymentStep('choose')
        }}
      >
        <DialogContent className="max-w-md">
          <DialogClose
            onClick={() => {
              setPaymentModalOpen(false)
              setPaymentStep('choose')
            }}
          />
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          {paymentStep === 'choose' ? (
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                size="lg"
                asChild
              >
                <a
                  href={crmPath(`/invoices?customer=${clientId ?? ''}&job=${job.id}`)}
                  onClick={() => setPaymentModalOpen(false)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Send Invoice via Stripe
                </a>
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                size="lg"
                onClick={() => {
                  setRecordMethod('cash')
                  setPaymentStep('record')
                }}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Cash
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                size="lg"
                onClick={() => {
                  setRecordMethod('etransfer')
                  setPaymentStep('record')
                }}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                E-Transfer
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                size="lg"
                onClick={() => {
                  setRecordMethod('cheque')
                  setPaymentStep('record')
                }}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Cheque
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Record {recordMethod} payment
              </p>
              {recordError && (
                <p className="text-sm text-red-400">{recordError}</p>
              )}
              <div>
                <Label htmlFor="pay-amount">Amount ($)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={recordAmount}
                  onChange={(e) => setRecordAmount(e.target.value)}
                  className="border-white/10 bg-[var(--surface-1)]"
                />
              </div>
              <div>
                <Label htmlFor="pay-ref">Reference (optional)</Label>
                <Input
                  id="pay-ref"
                  value={recordReference}
                  onChange={(e) => setRecordReference(e.target.value)}
                  placeholder="Check number, etc."
                  className="border-white/10 bg-[var(--surface-1)]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentStep('choose')}
                >
                  Back
                </Button>
                <Button
                  onClick={recordPayment}
                  disabled={
                    recordingPayment ||
                    !recordAmount ||
                    Number(recordAmount) <= 0
                  }
                >
                  {recordingPayment ? 'Saving...' : 'Record'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setDeleteConfirmOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete job?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
