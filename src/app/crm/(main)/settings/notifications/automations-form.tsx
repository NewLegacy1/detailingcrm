'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const CLIENT_VARIABLES = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'address', label: 'Address' },
  { key: 'notes', label: 'Notes' },
] as const

function VariablePicker({ onInsert }: { onInsert: (tag: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-sm text-[var(--text-3)] mr-1 self-center">Insert:</span>
      {CLIENT_VARIABLES.map(({ key, label }) => (
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-white/20'
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
  new_booking_sms_message?: string | null
  new_booking_email_message?: string | null
  job_reminder_mins?: number
  job_reminder_email_on?: boolean
  job_reminder_client_email_on?: boolean
  job_reminder_client_sms_on?: boolean
  job_reminder_user_email_on?: boolean
  job_reminder_user_sms_on?: boolean
  job_reminder_sms_message?: string | null
  review_request_message?: string | null
  maintenance_upsell_days?: number[] | null
  maintenance_detail_url?: string | null
  abandoned_cart_enabled?: boolean
  abandoned_cart_hours?: number
  follow_up_hours?: number
}

export function AutomationsForm({ onSaved }: { onSaved?: () => void } = {}) {
  const [loading, setLoading] = useState(true)
  const [bookingSlug, setBookingSlug] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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
    new_booking_sms_message: '',
    new_booking_email_message: '',
    job_reminder_mins: 60,
    job_reminder_email_on: false,
    job_reminder_client_email_on: true,
    job_reminder_client_sms_on: true,
    job_reminder_user_email_on: false,
    job_reminder_user_sms_on: false,
    job_reminder_sms_message: '',
    review_request_message: '',
    maintenance_upsell_days: [14, 30, 45],
    maintenance_detail_url: '',
    abandoned_cart_enabled: false,
    abandoned_cart_hours: 1,
    follow_up_hours: 48,
  })

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setBookingSlug(data.booking_slug ?? null)
          setForm({
            review_follow_up_days: data.review_follow_up_days ?? 1,
            review_follow_up_hours: data.review_follow_up_hours ?? 24,
            review_page_url: data.review_page_url ?? '',
            gmb_redirect_url: data.gmb_redirect_url ?? '',
            under_five_feedback_email: data.under_five_feedback_email ?? '',
            new_booking_email_on: data.new_booking_email_on ?? true,
            new_booking_sms_on: data.new_booking_sms_on ?? true,
            new_booking_client_email_on: data.new_booking_client_email_on ?? true,
            new_booking_client_sms_on: data.new_booking_client_sms_on ?? true,
            new_booking_user_email_on: data.new_booking_user_email_on ?? true,
            new_booking_user_sms_on: data.new_booking_user_sms_on ?? true,
            new_booking_sms_message: data.new_booking_sms_message ?? '',
            new_booking_email_message: data.new_booking_email_message ?? '',
            job_reminder_mins: data.job_reminder_mins ?? 60,
            job_reminder_email_on: data.job_reminder_email_on ?? false,
            job_reminder_client_email_on: data.job_reminder_client_email_on ?? true,
            job_reminder_client_sms_on: data.job_reminder_client_sms_on ?? true,
            job_reminder_user_email_on: data.job_reminder_user_email_on ?? false,
            job_reminder_user_sms_on: data.job_reminder_user_sms_on ?? false,
            job_reminder_sms_message: data.job_reminder_sms_message ?? '',
            review_request_message: data.review_request_message ?? '',
            maintenance_upsell_days: Array.isArray(data.maintenance_upsell_days) ? data.maintenance_upsell_days : [14, 30, 45],
            maintenance_detail_url: data.maintenance_detail_url ?? '',
            abandoned_cart_enabled: data.abandoned_cart_enabled ?? false,
            abandoned_cart_hours: data.abandoned_cart_hours ?? 1,
            follow_up_hours: data.follow_up_hours ?? 48,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

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
          new_booking_sms_message: form.new_booking_sms_message || null,
          new_booking_email_message: form.new_booking_email_message || null,
          job_reminder_sms_message: form.job_reminder_sms_message || null,
          review_request_message: form.review_request_message || null,
          maintenance_upsell_days: form.maintenance_upsell_days,
          maintenance_detail_url: form.maintenance_detail_url || null,
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
      <div className="card p-6 space-y-4">
        <h2 className="section-title text-white">Review follow-up</h2>
        <p className="text-base text-[var(--text-muted)]">Send a review request after job completion. 5 stars → redirect to GMB; under 5 → feedback to email.</p>
        <div>
          <Label className="text-base">Custom review request message</Label>
          <VariablePicker onInsert={(tag) => setForm((p) => ({ ...p, review_request_message: (p.review_request_message ?? '') + tag }))} />
          <Textarea
            value={form.review_request_message ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, review_request_message: e.target.value }))}
            placeholder="Hi {{name}}, how was your experience? We'd love your feedback."
            className="mt-1 min-h-[80px] text-base"
          />
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
              className="text-base"
            />
          </div>
          <div>
            <Label className="text-base">Review page URL</Label>
            {bookingSlug ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : 'https://detailops.vercel.app'}/review/${bookingSlug}`}
                  className="flex h-10 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-2)] cursor-default focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/review/${bookingSlug}`
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
              className="text-base"
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
              className="text-base"
            />
          </div>
        </div>
      </div>

      {/* New booking notification */}
      <div className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">New booking notification</h2>
        <p className="text-base text-[var(--text-muted)]">When a new booking is created, send notifications to the client and/or yourself.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Client</p>
            <Toggle checked={form.new_booking_client_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_client_email_on: v }))} label="Email" />
            <Toggle checked={form.new_booking_client_sms_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_client_sms_on: v }))} label="SMS" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">You</p>
            <Toggle checked={form.new_booking_user_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_user_email_on: v }))} label="Email" />
            <Toggle checked={form.new_booking_user_sms_on ?? true} onChange={(v) => setForm((p) => ({ ...p, new_booking_user_sms_on: v }))} label="SMS" />
          </div>
        </div>
        <div>
          <Label className="text-base">Custom SMS message</Label>
          <VariablePicker onInsert={(tag) => setForm((p) => ({ ...p, new_booking_sms_message: (p.new_booking_sms_message ?? '') + tag }))} />
          <Textarea value={form.new_booking_sms_message ?? ''} onChange={(e) => setForm((p) => ({ ...p, new_booking_sms_message: e.target.value }))} placeholder="Hi {{name}}, your detailing appointment is confirmed." className="mt-1 min-h-[70px] text-base" />
        </div>
        <div>
          <Label className="text-base">Custom email message</Label>
          <VariablePicker onInsert={(tag) => setForm((p) => ({ ...p, new_booking_email_message: (p.new_booking_email_message ?? '') + tag }))} />
          <Textarea value={form.new_booking_email_message ?? ''} onChange={(e) => setForm((p) => ({ ...p, new_booking_email_message: e.target.value }))} placeholder="Hi {{name}}, your booking is confirmed. We'll see you at {{address}}." className="mt-1 min-h-[70px] text-base" />
        </div>
      </div>

      {/* Job reminders */}
      <div className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Job reminders</h2>
        <p className="text-base text-[var(--text-muted)]">Remind the client and/or yourself before the scheduled job time.</p>
        <div className="flex items-center gap-3 flex-wrap">
          <Label htmlFor="job_reminder_mins" className="text-base">Minutes before</Label>
          <Input id="job_reminder_mins" type="number" min={0} className="w-28 text-base" value={form.job_reminder_mins ?? 60} onChange={(e) => setForm((p) => ({ ...p, job_reminder_mins: Number(e.target.value) || 60 }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">Client</p>
            <Toggle checked={form.job_reminder_client_email_on ?? true} onChange={(v) => setForm((p) => ({ ...p, job_reminder_client_email_on: v }))} label="Email" />
            <Toggle checked={form.job_reminder_client_sms_on ?? true} onChange={(v) => setForm((p) => ({ ...p, job_reminder_client_sms_on: v }))} label="SMS" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-wide">You</p>
            <Toggle checked={form.job_reminder_user_email_on ?? false} onChange={(v) => setForm((p) => ({ ...p, job_reminder_user_email_on: v }))} label="Email" />
            <Toggle checked={form.job_reminder_user_sms_on ?? false} onChange={(v) => setForm((p) => ({ ...p, job_reminder_user_sms_on: v }))} label="SMS" />
          </div>
        </div>
        <div>
          <Label className="text-base">Custom SMS reminder</Label>
          <VariablePicker onInsert={(tag) => setForm((p) => ({ ...p, job_reminder_sms_message: (p.job_reminder_sms_message ?? '') + tag }))} />
          <Textarea value={form.job_reminder_sms_message ?? ''} onChange={(e) => setForm((p) => ({ ...p, job_reminder_sms_message: e.target.value }))} placeholder="Hi {{name}}, reminder: your appointment is coming up." className="mt-1 min-h-[70px] text-base" />
        </div>
      </div>

      {/* Maintenance upsell */}
      <div className="card p-6 space-y-4">
        <h2 className="section-title text-[var(--text)]">Maintenance upsell</h2>
        <p className="text-base text-[var(--text-muted)]">After a job is done, send follow-ups at set day intervals with a link to book maintenance.</p>
        <div>
          <Label htmlFor="maintenance_detail_url" className="text-base">Maintenance / detail page URL</Label>
          <Input id="maintenance_detail_url" placeholder="https://..." value={form.maintenance_detail_url ?? ''} onChange={(e) => setForm((p) => ({ ...p, maintenance_detail_url: e.target.value }))} className="text-base" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">Days: {(form.maintenance_upsell_days ?? [14, 30, 45]).join(', ')}. Edit in database if needed.</p>
      </div>

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
