'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { Pencil } from 'lucide-react'

/** Wraps a section with simple default view and "Customize" button to show full form. */
function SectionCard({
  id,
  title,
  description,
  expanded,
  onToggle,
  simpleContent,
  fullContent,
}: {
  id: string
  title: string
  description: string
  expanded: boolean
  onToggle: () => void
  simpleContent: React.ReactNode
  fullContent: React.ReactNode
}) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="section-title text-[var(--text)]">{title}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onToggle} className="shrink-0">
          {expanded ? (
            <>Done</>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Customize
            </>
          )}
        </Button>
      </div>
      {expanded ? fullContent : simpleContent}
    </div>
  )
}

/** Fixed subject/body for review follow-up (not user-customizable). */
const REVIEW_REQUEST_SUBJECT = 'How was your experience?'
const REVIEW_REQUEST_MESSAGE = "Hi {{name}}, thanks for choosing us! Please share your experience: {{reviewUrl}}"

const CLIENT_VARIABLES = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'address', label: 'Address' },
  { key: 'notes', label: 'Notes' },
] as const

function VariablePicker({ onInsert, extra }: { onInsert: (tag: string) => void; extra?: { key: string; label: string }[] }) {
  const all = [...CLIENT_VARIABLES, ...(extra ?? [])]
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-sm text-[var(--text-3)] mr-1 self-center">Insert:</span>
      {all.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onInsert(`{{${key}}}`)}
          className="rounded border px-2 py-1 text-sm transition-colors hover:bg-white/10"
          style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 select-none ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          disabled ? 'bg-white/10' : checked ? 'bg-emerald-500' : 'bg-white/20'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-[var(--text)]">{label}</span>
    </label>
  )
}

interface OrgAutomations {
  review_follow_up_days?: number
  review_follow_up_hours?: number
  review_page_url?: string | null
  gmb_redirect_url?: string | null
  under_five_feedback_email?: string | null
  new_booking_email_on?: boolean
  new_booking_sms_on?: boolean
  new_booking_client_email_on?: boolean
  new_booking_client_sms_on?: boolean
  new_booking_user_email_on?: boolean
  new_booking_user_sms_on?: boolean
  job_reminder_mins?: number
  job_reminder_email_on?: boolean
  job_reminder_client_email_on?: boolean
  job_reminder_client_sms_on?: boolean
  job_reminder_user_email_on?: boolean
  job_reminder_user_sms_on?: boolean
  job_reminder_sms_message?: string | null
  job_reminder_subject?: string | null
  review_request_message?: string | null
  review_request_subject?: string | null
  maintenance_upsell_days?: number[] | null
  maintenance_detail_url?: string | null
  maintenance_upsell_subject?: string | null
  maintenance_upsell_message?: string | null
  maintenance_discount_type?: 'none' | 'percent' | 'fixed'
  maintenance_discount_value?: number
  maintenance_upsell_excluded_service_ids?: string[] | null
  abandoned_cart_enabled?: boolean
  abandoned_cart_hours?: number
  follow_up_hours?: number
}

function buildFormFromApiData(data: Record<string, unknown>, defaultReviewUrl = ''): OrgAutomations {
  return {
    review_follow_up_days: (data.review_follow_up_days as number) ?? 1,
    review_follow_up_hours: (data.review_follow_up_hours as number) ?? 24,
    review_page_url: ((data.review_page_url as string)?.trim() || defaultReviewUrl) ?? '',
    gmb_redirect_url: (data.gmb_redirect_url as string) ?? '',
    under_five_feedback_email: (data.under_five_feedback_email as string) ?? '',
    new_booking_email_on: (data.new_booking_email_on as boolean) ?? true,
    new_booking_sms_on: (data.new_booking_sms_on as boolean) ?? true,
    new_booking_client_email_on: (data.new_booking_client_email_on as boolean) ?? true,
    new_booking_client_sms_on: (data.new_booking_client_sms_on as boolean) ?? true,
    new_booking_user_email_on: (data.new_booking_user_email_on as boolean) ?? true,
    new_booking_user_sms_on: (data.new_booking_user_sms_on as boolean) ?? true,
    job_reminder_mins: (data.job_reminder_mins as number) ?? 60,
    job_reminder_email_on: (data.job_reminder_email_on as boolean) ?? false,
    job_reminder_client_email_on: (data.job_reminder_client_email_on as boolean) ?? true,
    job_reminder_client_sms_on: (data.job_reminder_client_sms_on as boolean) ?? true,
    job_reminder_user_email_on: (data.job_reminder_user_email_on as boolean) ?? false,
    job_reminder_user_sms_on: (data.job_reminder_user_sms_on as boolean) ?? false,
    job_reminder_sms_message: (data.job_reminder_sms_message as string) ?? '',
    job_reminder_subject: (data.job_reminder_subject as string) ?? '',
    review_request_message: (data.review_request_message as string) ?? '',
    review_request_subject: (data.review_request_subject as string) ?? '',
    maintenance_upsell_days: Array.isArray(data.maintenance_upsell_days) ? data.maintenance_upsell_days as number[] : [14, 30, 45],
    maintenance_detail_url: (data.maintenance_detail_url as string) ?? '',
    maintenance_upsell_subject: (data.maintenance_upsell_subject as string) ?? '',
    maintenance_upsell_message: (data.maintenance_upsell_message as string) ?? '',
    maintenance_discount_type: (data.maintenance_discount_type === 'percent' || data.maintenance_discount_type === 'fixed') ? data.maintenance_discount_type : 'none',
    maintenance_discount_value: typeof data.maintenance_discount_value === 'number' ? data.maintenance_discount_value : 0,
    maintenance_upsell_excluded_service_ids: Array.isArray(data.maintenance_upsell_excluded_service_ids) ? data.maintenance_upsell_excluded_service_ids as string[] : [],
    abandoned_cart_enabled: (data.abandoned_cart_enabled as boolean) ?? false,
    abandoned_cart_hours: (data.abandoned_cart_hours as number) ?? 1,
    follow_up_hours: (data.follow_up_hours as number) ?? 48,
  }
}

export function AutomationsForm({ orgData, onSaved }: { orgData?: OrgAutomations | null; onSaved?: () => void } = {}) {
  const [loading, setLoading] = useState(true)
  const [bookingSlug, setBookingSlug] = useState<string | null>(null)
  const [services, setServices] = useState<{ name: string; ids: string[] }[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testEmailInput, setTestEmailInput] = useState('')
  const [savingTestEmail, setSavingTestEmail] = useState(false)
  const [testEmailMessage, setTestEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testReviewEmailInput, setTestReviewEmailInput] = useState('')
  const [savingTestReview, setSavingTestReview] = useState(false)
  const [testReviewMessage, setTestReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testReminderEmailInput, setTestReminderEmailInput] = useState('')
  const [savingTestReminder, setSavingTestReminder] = useState(false)
  const [testReminderMessage, setTestReminderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testNewBookingEmailInput, setTestNewBookingEmailInput] = useState('')
  const [savingTestNewBooking, setSavingTestNewBooking] = useState(false)
  const [testNewBookingMessage, setTestNewBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [form, setForm] = useState<OrgAutomations>({
    review_follow_up_days: 1,
    review_follow_up_hours: 24,
    review_page_url: '',
    gmb_redirect_url: '',
    under_five_feedback_email: '',
    new_booking_email_on: true,
    new_booking_sms_on: true,
    new_booking_client_email_on: true,
    new_booking_client_sms_on: true,
    new_booking_user_email_on: true,
    new_booking_user_sms_on: true,
    job_reminder_mins: 60,
    job_reminder_email_on: false,
    job_reminder_client_email_on: true,
    job_reminder_client_sms_on: true,
    job_reminder_user_email_on: false,
    job_reminder_user_sms_on: false,
    job_reminder_sms_message: '',
    job_reminder_subject: '',
    review_request_message: '',
    review_request_subject: '',
    maintenance_upsell_days: [14, 30, 45],
    maintenance_detail_url: '',
    maintenance_upsell_subject: '',
    maintenance_upsell_message: '',
    maintenance_discount_type: 'none',
    maintenance_discount_value: 0,
    maintenance_upsell_excluded_service_ids: [],
    abandoned_cart_enabled: false,
    abandoned_cart_hours: 1,
    follow_up_hours: 48,
  })

  useEffect(() => {
    if (orgData != null) {
      setBookingSlug((orgData as { booking_slug?: string }).booking_slug ?? null)
      setForm(buildFormFromApiData(orgData as Record<string, unknown>))
      setLoading(false)
      return
    }
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setBookingSlug(data.booking_slug ?? null)
          const slug = data.booking_slug?.trim()
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          const defaultReviewUrl = slug && origin ? `${origin}/review/${slug}` : ''
          setForm(buildFormFromApiData(data, defaultReviewUrl))
        }
      })
      .finally(() => setLoading(false))
  }, [orgData])

  useEffect(() => {
    if (orgData == null) return
    setForm(buildFormFromApiData(orgData as Record<string, unknown>))
  }, [orgData])

  useEffect(() => {
    if (loading) return
    const supabase = createClient()
    supabase
      .from('services')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        const list = data ?? []
        const byName = new Map<string, { name: string; ids: string[] }>()
        for (const s of list) {
          const name = (s.name ?? '').trim() || 'Unnamed service'
          const existing = byName.get(name)
          if (existing) existing.ids.push(s.id)
          else byName.set(name, { name, ids: [s.id] })
        }
        setServices(Array.from(byName.values()))
      })
  }, [loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_follow_up_days: form.review_follow_up_days,
          review_follow_up_hours: form.review_follow_up_hours,
          review_page_url: form.review_page_url || null,
          gmb_redirect_url: form.gmb_redirect_url || null,
          under_five_feedback_email: form.under_five_feedback_email || null,
          new_booking_email_on: form.new_booking_email_on,
          new_booking_sms_on: form.new_booking_sms_on,
          new_booking_client_email_on: form.new_booking_client_email_on,
          new_booking_client_sms_on: form.new_booking_client_sms_on,
          new_booking_user_email_on: form.new_booking_user_email_on,
          new_booking_user_sms_on: form.new_booking_user_sms_on,
          job_reminder_mins: form.job_reminder_mins,
          job_reminder_email_on: form.job_reminder_email_on,
          job_reminder_client_email_on: form.job_reminder_client_email_on,
          job_reminder_client_sms_on: form.job_reminder_client_sms_on,
          job_reminder_user_email_on: form.job_reminder_user_email_on,
          job_reminder_user_sms_on: form.job_reminder_user_sms_on,
          job_reminder_sms_message: form.job_reminder_sms_message || null,
          job_reminder_subject: form.job_reminder_subject?.trim() || null,
          review_request_message: REVIEW_REQUEST_MESSAGE,
          review_request_subject: REVIEW_REQUEST_SUBJECT,
          maintenance_upsell_days: form.maintenance_upsell_days,
          maintenance_detail_url: form.maintenance_detail_url || null,
          maintenance_upsell_subject: form.maintenance_upsell_subject?.trim() || null,
          maintenance_upsell_message: form.maintenance_upsell_message || null,
          maintenance_discount_type: form.maintenance_discount_type || 'none',
          maintenance_discount_value: form.maintenance_discount_value ?? 0,
          maintenance_upsell_excluded_service_ids: form.maintenance_upsell_excluded_service_ids ?? [],
          abandoned_cart_enabled: form.abandoned_cart_enabled,
          abandoned_cart_hours: form.abandoned_cart_hours,
          follow_up_hours: form.follow_up_hours,
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Saved.' })
        onSaved?.()
      } else setMessage({ type: 'error', text: (await res.json()).error || 'Failed to save' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  if (loading) return <div className="text-base text-[var(--text-muted)]">Loading…</div>

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && (
        <p className={message.type === 'success' ? 'text-base text-green-500' : 'text-base text-red-400'}>{message.text}</p>
      )}
      <p className="rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-muted)]">
        Use variables: <code className="text-[var(--accent)]">{'{{name}}'}</code>, <code className="text-[var(--accent)]">{'{{email}}'}</code>, <code className="text-[var(--accent)]">{'{{phone}}'}</code>, <code className="text-[var(--accent)]">{'{{address}}'}</code>
      </p>

      {/* Review follow-up */}
      <SectionCard
        id="review"
        title="Review follow-up"
        description="Send a review request after job completion. 5 stars → GMB; under 5 → feedback to your email."
        expanded={expandedSection === 'review'}
        onToggle={() => setExpandedSection((s) => (s === 'review' ? null : 'review'))}
        simpleContent={
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="review_follow_up_hours_simple" className="text-sm text-[var(--text-2)]">Hours after job</Label>
                <Input
                  id="review_follow_up_hours_simple"
                  type="number"
                  min={1}
                  className="w-20 text-base"
                  value={form.review_follow_up_hours ?? 24}
                  onChange={(e) => setForm((p) => ({ ...p, review_follow_up_hours: Number(e.target.value) || 24 }))}
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Label htmlFor="under_five_simple" className="text-sm text-[var(--text-2)] shrink-0">Under 5 stars →</Label>
                <Input
                  id="under_five_simple"
                  type="email"
                  placeholder="your@email.com"
                  className="max-w-[200px] text-base"
                  value={form.under_five_feedback_email ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, under_five_feedback_email: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Review link: {bookingSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/review/${bookingSlug}` : 'Set booking slug in Branding'}
            </p>
          </div>
        }
        fullContent={
            <>
            <div>
              <Label className="text-base">Email subject</Label>
              <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-base text-[var(--text-2)]">{REVIEW_REQUEST_SUBJECT}</p>
            </div>
            <div>
              <Label className="text-base">Review request message</Label>
              <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-base text-[var(--text-2)] whitespace-pre-wrap">{REVIEW_REQUEST_MESSAGE}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="review_follow_up_hours" className="text-base">Hours after job to send</Label>
                <Input
                  id="review_follow_up_hours"
                  type="number"
                  min={1}
                  value={form.review_follow_up_hours ?? 24}
                  onChange={(e) => setForm((p) => ({ ...p, review_follow_up_hours: Number(e.target.value) || 24 }))}
                  className="mt-1 text-base"
                />
              </div>
              <div>
                <Label className="text-base">Review page URL</Label>
                {bookingSlug ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={`${(typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL.trim() ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '') : null) ?? (typeof window !== 'undefined' ? window.location.origin : 'https://detailops.ca')}/review/${bookingSlug}`}
                      className="flex h-10 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-2)] cursor-default focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const origin = (typeof process.env.NEXT_PUBLIC_APP_URL === 'string' && process.env.NEXT_PUBLIC_APP_URL.trim() ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '') : null) ?? (typeof window !== 'undefined' ? window.location.origin : 'https://detailops.ca')
                        const url = `${origin}/review/${bookingSlug}`
                        navigator.clipboard.writeText(url)
                      }}
                      className="shrink-0 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-2)] hover:bg-white/10 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] mt-1">Set your booking slug in Branding settings to auto-generate this URL.</p>
                )}
              </div>
              <div>
                <Label htmlFor="gmb_redirect_url" className="text-base">GMB redirect (5 stars)</Label>
                <Input
                  id="gmb_redirect_url"
                  placeholder="Google My Business review link"
                  value={form.gmb_redirect_url ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, gmb_redirect_url: e.target.value }))}
                  className="mt-1 text-base"
                />
              </div>
              <div>
                <Label htmlFor="under_five_feedback_email" className="text-base">Under-5 feedback email</Label>
                <Input
                  id="under_five_feedback_email"
                  type="email"
                  placeholder="Receive feedback here"
                  value={form.under_five_feedback_email ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, under_five_feedback_email: e.target.value }))}
                  className="mt-1 text-base"
                />
              </div>
            </div>
            <div>
              <Label className="text-base">Send test email</Label>
              <p className="text-sm text-[var(--text-muted)] mb-2">Receive a sample review request email to verify the message and link.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={testReviewEmailInput}
                  onChange={(e) => setTestReviewEmailInput(e.target.value)}
                  className="w-56 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingTestReview || !testReviewEmailInput.trim()}
                  onClick={async () => {
                    const email = testReviewEmailInput.trim()
                    if (!email) return
                    setSavingTestReview(true)
                    setTestReviewMessage(null)
                    try {
                      const res = await fetch('/api/settings/test-review-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok) {
                        setTestReviewMessage({ type: 'success', text: data.message ?? `Test email sent to ${email}.` })
                      } else {
                        setTestReviewMessage({ type: 'error', text: data.error ?? 'Failed to send test email' })
                      }
                    } catch {
                      setTestReviewMessage({ type: 'error', text: 'Failed to send test email' })
                    }
                    setSavingTestReview(false)
                  }}
                >
                  {savingTestReview ? 'Sending…' : 'Send test review email'}
                </Button>
              </div>
              {testReviewMessage && (
                <p className={`mt-2 text-sm ${testReviewMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                  {testReviewMessage.text}
                </p>
              )}
            </div>
          </>
        }
      />

      {/* New booking notification */}
      <SectionCard
        id="new_booking"
        title="New booking notification"
        description="When a new booking is created, notify the client and/or yourself."
        expanded={expandedSection === 'new_booking'}
        onToggle={() => setExpandedSection((s) => (s === 'new_booking' ? null : 'new_booking'))}
        simpleContent={
          <div className="space-y-3 pt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)]">Client</p>
                <Toggle checked={form.new_booking_client_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_client_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)]">You</p>
                <Toggle checked={form.new_booking_user_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_user_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
            </div>
          </div>
        }
        fullContent={
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Client</p>
                <Toggle checked={form.new_booking_client_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_client_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">You</p>
                <Toggle checked={form.new_booking_user_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_user_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Client receives a confirmation; you get a formatted email with job details. SMS: coming soon. Set contact email/phone in Settings → Branding for &quot;You&quot; notifications.</p>
            <div>
              <Label className="text-base">Send test email</Label>
              <p className="text-sm text-[var(--text-muted)] mb-2">Receive a sample &quot;You have a new booking!&quot; email.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={testNewBookingEmailInput}
                  onChange={(e) => setTestNewBookingEmailInput(e.target.value)}
                  className="w-56 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingTestNewBooking || !testNewBookingEmailInput.trim()}
                  onClick={async () => {
                    const email = testNewBookingEmailInput.trim()
                    if (!email) return
                    setSavingTestNewBooking(true)
                    setTestNewBookingMessage(null)
                    try {
                      const res = await fetch('/api/settings/test-new-booking-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok) {
                        setTestNewBookingMessage({ type: 'success', text: data.message ?? `Test email sent to ${email}.` })
                      } else {
                        setTestNewBookingMessage({ type: 'error', text: data.error ?? 'Failed to send test email' })
                      }
                    } catch {
                      setTestNewBookingMessage({ type: 'error', text: 'Failed to send test email' })
                    }
                    setSavingTestNewBooking(false)
                  }}
                >
                  {savingTestNewBooking ? 'Sending…' : 'Send test'}
                </Button>
              </div>
              {testNewBookingMessage && (
                <p className={`mt-2 text-sm ${testNewBookingMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                  {testNewBookingMessage.text}
                </p>
              )}
            </div>
          </>
        }
      />

      {/* Job reminders */}
      <SectionCard
        id="job_reminder"
        title="Job reminders"
        description="Remind the client and/or yourself before the scheduled job."
        expanded={expandedSection === 'job_reminder'}
        onToggle={() => setExpandedSection((s) => (s === 'job_reminder' ? null : 'job_reminder'))}
        simpleContent={
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="job_reminder_mins_simple" className="text-sm text-[var(--text-2)]">Minutes before</Label>
                <Input id="job_reminder_mins_simple" type="number" min={0} className="w-20 text-base" value={form.job_reminder_mins ?? 60} onChange={(e) => setForm((p) => ({ ...p, job_reminder_mins: Number(e.target.value) || 60 }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)]">Client</p>
                <Toggle checked={form.job_reminder_client_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, job_reminder_client_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)]">You</p>
                <Toggle checked={form.job_reminder_user_email_on ?? false} onChange={(v) => setForm((p) => ({ ...p, job_reminder_user_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)] line-clamp-2">
              {(form.job_reminder_sms_message ?? '').trim() || 'Hi {{name}}, reminder: your appointment is at {{scheduledAt}}.'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">SMS: coming soon.</p>
          </div>
        }
        fullContent={
          <>
            <div>
              <Label htmlFor="job_reminder_subject" className="text-base">Email subject</Label>
              <Input
                id="job_reminder_subject"
                placeholder="Appointment reminder"
                value={form.job_reminder_subject ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, job_reminder_subject: e.target.value }))}
                className="mt-1 text-base"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Label htmlFor="job_reminder_mins" className="text-base">Minutes before</Label>
              <Input id="job_reminder_mins" type="number" min={0} className="w-28 text-base" value={form.job_reminder_mins ?? 60} onChange={(e) => setForm((p) => ({ ...p, job_reminder_mins: Number(e.target.value) || 60 }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Client</p>
                <Toggle checked={form.job_reminder_client_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, job_reminder_client_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">You</p>
                <Toggle checked={form.job_reminder_user_email_on ?? false} onChange={(v) => setForm((p) => ({ ...p, job_reminder_user_email_on: v }))} label="Email" />
                <Toggle checked={false} onChange={() => {}} label="SMS (coming soon)" disabled />
              </div>
            </div>
            <div>
              <Label className="text-base">Custom reminder message (email)</Label>
              <VariablePicker onInsert={(tag) => setForm((p) => ({ ...p, job_reminder_sms_message: (p.job_reminder_sms_message ?? '') + tag }))} extra={[{ key: 'scheduledAt', label: 'Appointment time' }]} />
              <Textarea value={form.job_reminder_sms_message ?? ''} onChange={(e) => setForm((p) => ({ ...p, job_reminder_sms_message: e.target.value }))} placeholder="Hi {{name}}, reminder: your appointment is at {{scheduledAt}}." className="mt-1 min-h-[70px] text-base" />
              <p className="text-xs text-[var(--text-muted)] mt-1">SMS: coming soon.</p>
            </div>
            <div>
              <Label className="text-base">Send test email</Label>
              <p className="text-sm text-[var(--text-muted)] mb-2">Receive a sample reminder email.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={testReminderEmailInput}
                  onChange={(e) => setTestReminderEmailInput(e.target.value)}
                  className="w-56 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingTestReminder || !testReminderEmailInput.trim()}
                  onClick={async () => {
                    const email = testReminderEmailInput.trim()
                    if (!email) return
                    setSavingTestReminder(true)
                    setTestReminderMessage(null)
                    try {
                      const res = await fetch('/api/settings/test-reminder-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok) {
                        setTestReminderMessage({ type: 'success', text: data.message ?? `Test email sent to ${email}.` })
                      } else {
                        setTestReminderMessage({ type: 'error', text: data.error ?? 'Failed to send test email' })
                      }
                    } catch {
                      setTestReminderMessage({ type: 'error', text: 'Failed to send test email' })
                    }
                    setSavingTestReminder(false)
                  }}
                >
                  {savingTestReminder ? 'Sending…' : 'Send test reminder email'}
                </Button>
              </div>
              {testReminderMessage && (
                <p className={`mt-2 text-sm ${testReminderMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                  {testReminderMessage.text}
                </p>
              )}
            </div>
          </>
        }
      />

      {/* Maintenance upsell */}
      <SectionCard
        id="maintenance"
        title="Maintenance upsell"
        description="Send follow-up emails after a job with a link to rebook (e.g. 14, 30, 45 days)."
        expanded={expandedSection === 'maintenance'}
        onToggle={() => setExpandedSection((s) => (s === 'maintenance' ? null : 'maintenance'))}
        simpleContent={
          <div className="space-y-3 pt-1">
            <p className="text-sm text-[var(--text)]">
              Days: <strong>{(form.maintenance_upsell_days ?? [14, 30, 45]).join(', ')}</strong>
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Discount: {form.maintenance_discount_type === 'none' ? 'None' : form.maintenance_discount_type === 'percent' ? `${form.maintenance_discount_value ?? 0}% off` : `$${form.maintenance_discount_value ?? 0} off`}
            </p>
            <p className="text-sm text-[var(--text-muted)] line-clamp-2">
              {(form.maintenance_upsell_message ?? '').trim() || 'Hi {{name}}, time for a refresh? Book your next detail: {{maintenanceUrl}}'}
            </p>
          </div>
        }
        fullContent={
          <>
        <div>
          <Label className="text-base">Services that get maintenance emails</Label>
          <p className="text-sm text-[var(--text-muted)] mb-2">By default, customers get maintenance emails for all job types. Exclude services (e.g. Ceramic Coating) that should not get these emails.</p>
          {services.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No services yet. Add services in Settings → Services.</p>
          ) : (
            <ul className="space-y-2">
              {services.map((group) => {
                const excluded = group.ids.some((id) => (form.maintenance_upsell_excluded_service_ids ?? []).includes(id))
                return (
                  <li key={group.name + group.ids[0]}>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={excluded}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setForm((p) => {
                            const prev = p.maintenance_upsell_excluded_service_ids ?? []
                            if (checked) {
                              const next = [...prev]
                              for (const id of group.ids) {
                                if (!next.includes(id)) next.push(id)
                              }
                              return { ...p, maintenance_upsell_excluded_service_ids: next }
                            }
                            return { ...p, maintenance_upsell_excluded_service_ids: prev.filter((id) => !group.ids.includes(id)) }
                          })
                        }}
                        className="rounded border-[var(--border)]"
                      />
                      <span className="text-sm text-[var(--text)]">
                        {excluded ? 'Don’t send' : 'Send'} maintenance email for <strong>{group.name}</strong>
                        {group.ids.length > 1 && <span className="text-[var(--text-muted)] ml-1">({group.ids.length} entries)</span>}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div>
          <Label htmlFor="maintenance_detail_url" className="text-base">Custom booking URL (optional)</Label>
          <p className="text-sm text-[var(--text-muted)] mb-1">
            Leave blank to use your default booking page: {bookingSlug ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/book/${bookingSlug}` : '…/book/[your-slug]'}
          </p>
          <Input id="maintenance_detail_url" placeholder="Only if you use a custom domain" value={form.maintenance_detail_url ?? ''} onChange={(e) => setForm((p) => ({ ...p, maintenance_detail_url: e.target.value }))} className="text-base" />
        </div>
        <div>
          <Label htmlFor="maintenance_upsell_subject" className="text-base">Email subject</Label>
          <Input
            id="maintenance_upsell_subject"
            placeholder="Time for your next detail?"
            value={form.maintenance_upsell_subject ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, maintenance_upsell_subject: e.target.value }))}
            className="mt-1 text-base"
          />
        </div>
        <div>
          <Label className="text-base">Custom maintenance email message</Label>
          <VariablePicker onInsert={(tag) => setForm((p) => ({ ...p, maintenance_upsell_message: (p.maintenance_upsell_message ?? '') + tag }))} extra={[{ key: 'maintenanceUrl', label: 'Booking URL' }, { key: 'maintenanceDiscount', label: 'Discount (e.g. 10% off)' }]} />
          <Textarea
            value={form.maintenance_upsell_message ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, maintenance_upsell_message: e.target.value }))}
            placeholder="Hi {{name}}, time for a refresh? Book your next detail: {{maintenanceUrl}}"
            className="mt-1 min-h-[70px] text-base"
          />
        </div>
        <div>
          <Label className="text-base">Maintenance rebook discount</Label>
          <p className="text-sm text-[var(--text-muted)] mb-2">Applied when the customer books from the maintenance email link.</p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={form.maintenance_discount_type ?? 'none'}
              onChange={(e) => setForm((p) => ({ ...p, maintenance_discount_type: e.target.value as 'none' | 'percent' | 'fixed' }))}
              className="rounded border bg-[var(--surface-1)] border-white/10 px-3 py-2 text-base text-[var(--text)]"
            >
              <option value="none">None</option>
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
            {(form.maintenance_discount_type === 'percent' || form.maintenance_discount_type === 'fixed') && (
              <div className="flex items-center gap-2">
                {form.maintenance_discount_type === 'percent' && (
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    className="w-20 text-base"
                    value={form.maintenance_discount_value ?? 0}
                    onChange={(e) => setForm((p) => ({ ...p, maintenance_discount_value: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                  />
                )}
                {form.maintenance_discount_type === 'fixed' && (
                  <span className="text-[var(--text)]">$</span>
                )}
                {form.maintenance_discount_type === 'fixed' && (
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    className="w-24 text-base"
                    value={form.maintenance_discount_value ?? 0}
                    onChange={(e) => setForm((p) => ({ ...p, maintenance_discount_value: Math.max(0, Number(e.target.value) || 0) }))}
                  />
                )}
                <span className="text-sm text-[var(--text-muted)]">
                  {form.maintenance_discount_type === 'percent' ? '% off' : 'off'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="maintenance_upsell_days" className="text-base">Days after job to send</Label>
          <p className="text-sm text-[var(--text-muted)] mb-1">Comma-separated (e.g. 14, 30, 45). Emails go out at each of these days after a job is completed.</p>
          <Input
            id="maintenance_upsell_days"
            type="text"
            placeholder="14, 30, 45"
            className="mt-1 text-base"
            value={(form.maintenance_upsell_days ?? [14, 30, 45]).join(', ')}
            onChange={(e) => {
              const raw = e.target.value
              const parsed = raw
                .split(/[\s,]+/)
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 365)
              const uniq = [...new Set(parsed)].sort((a, b) => a - b)
              setForm((p) => ({ ...p, maintenance_upsell_days: uniq.length ? uniq : [14, 30, 45] }))
            }}
          />
        </div>
        <div>
          <Label className="text-base">Send test email</Label>
          <p className="text-sm text-[var(--text-muted)] mb-2">Receive a sample maintenance email with a real link. Click it to confirm the discount applies on the booking page.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={testEmailInput}
              onChange={(e) => setTestEmailInput(e.target.value)}
              className="w-56 text-base"
            />
            <Button
              type="button"
              variant="outline"
              disabled={savingTestEmail || !testEmailInput.trim()}
              onClick={async () => {
                const email = testEmailInput.trim()
                if (!email) return
                setSavingTestEmail(true)
                setTestEmailMessage(null)
                try {
                  const res = await fetch('/api/settings/test-maintenance-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                  })
                  const data = await res.json().catch(() => ({}))
                  if (res.ok) {
                    setTestEmailMessage({ type: 'success', text: data.message ?? `Test email sent to ${email}.` })
                  } else {
                    setTestEmailMessage({ type: 'error', text: data.error ?? 'Failed to send test email' })
                  }
                } catch {
                  setTestEmailMessage({ type: 'error', text: 'Failed to send test email' })
                }
                setSavingTestEmail(false)
              }}
            >
              {savingTestEmail ? 'Sending…' : 'Send test maintenance email'}
            </Button>
          </div>
          {testEmailMessage && (
            <p className={`mt-2 text-sm ${testEmailMessage.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
              {testEmailMessage.text}
            </p>
          )}
        </div>
          </>
        }
      />

      {/* Abandoned cart */}
      <div className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Abandoned booking</h2>
        <p className="text-base text-[var(--text-muted)]">Follow up with visitors who started but did not complete a booking on your booking page.</p>
        <Toggle checked={form.abandoned_cart_enabled ?? false} onChange={(v) => setForm((p) => ({ ...p, abandoned_cart_enabled: v }))} label="Enable abandoned booking follow-up" />
        {form.abandoned_cart_enabled && (
          <div className="flex items-center gap-3 flex-wrap">
            <Label htmlFor="abandoned_cart_hours" className="text-base">Send follow-up after (hours)</Label>
            <Input id="abandoned_cart_hours" type="number" min={1} className="w-28 text-base" value={form.abandoned_cart_hours ?? 1} onChange={(e) => setForm((p) => ({ ...p, abandoned_cart_hours: Number(e.target.value) || 1 }))} />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </form>
  )
}
