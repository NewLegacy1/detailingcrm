'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, CalendarPlus, Bell, Wrench, ShoppingCart, Loader2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AutomationsForm } from '@/app/crm/(main)/settings/notifications/automations-form'
import { PLAN_PAGE_PATH } from '@/components/settings/plan-page-actions'
import { Button } from '@/components/ui/button'

interface OrgAutomations {
  review_follow_up_days?: number
  review_follow_up_enabled?: boolean
  review_page_url?: string | null
  gmb_redirect_url?: string | null
  under_five_feedback_email?: string | null
  new_booking_notification_enabled?: boolean
  new_booking_email_on?: boolean
  new_booking_sms_on?: boolean
  job_reminder_enabled?: boolean
  job_reminder_mins?: number
  job_reminder_email_on?: boolean
  maintenance_upsell_enabled?: boolean
  maintenance_upsell_days?: number[] | null
  maintenance_detail_url?: string | null
  abandoned_cart_enabled?: boolean
  abandoned_cart_hours?: number
}

function AutomationToggle({
  enabled,
  onToggle,
  saving,
}: {
  enabled: boolean
  onToggle: (val: boolean) => void
  saving: boolean
}) {
  return (
    <button
      type="button"
      disabled={saving}
      onClick={() => onToggle(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-emerald-500' : 'bg-white/20'
      } disabled:opacity-50`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function AutomationsPage() {
  const [data, setData] = useState<OrgAutomations | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingField, setSavingField] = useState<string | null>(null)

  const refetch = () =>
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [])

  async function toggleField(field: string, value: boolean) {
    setSavingField(field)
    try {
      await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      setData((d) => d ? { ...d, [field]: value } : d)
    } catch (_) {}
    setSavingField(null)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 lg:p-8" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading automations…
      </div>
    )
  }

  const isStarter = (data as { subscription_plan?: string } | null)?.subscription_plan === 'starter'
  if (isStarter) {
    return (
      <div className="flex flex-col items-center justify-center p-8 lg:p-12 text-center" style={{ background: 'var(--bg)', minHeight: '60vh' }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] mb-6">
          <Zap className="h-8 w-8" />
        </div>
        <h1 className="page-title mb-2" style={{ color: 'var(--text-1)' }}>Automations</h1>
        <p className="text-[var(--text-secondary)] max-w-md mb-8">
          Automations are a Pro feature. Review follow-up, booking confirmations, reminders, and more — upgrade to unlock.
        </p>
        <Link href={PLAN_PAGE_PATH}>
          <Button
            className="w-full sm:w-auto"
            style={{
              background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
              boxShadow: '0 4px 14px rgba(0,184,245,0.35)',
            }}
          >
            Upgrade to Pro
          </Button>
        </Link>
      </div>
    )
  }

  const reviewEnabled = data?.review_follow_up_enabled !== false
  const newBookingEnabled = data?.new_booking_notification_enabled !== false
  const jobReminderEnabled = data?.job_reminder_enabled !== false
  const maintenanceEnabled = data?.maintenance_upsell_enabled !== false
  const abandonedEnabled = data?.abandoned_cart_enabled === true

  const automations = [
    {
      key: 'review_follow_up_enabled',
      icon: <Star className="h-5 w-5" />,
      title: 'Review Follow-Up',
      description: 'Send a review request after a job is completed. 5 stars → GMB redirect; under 5 → feedback email.',
      enabled: reviewEnabled,
      details: [
        { label: 'Send after', value: `${data?.review_follow_up_days ?? 1} day(s)` },
        { label: 'Review page', value: data?.review_page_url ? 'Configured' : '—' },
        { label: 'GMB redirect', value: data?.gmb_redirect_url ? 'Configured' : '—' },
        { label: 'Feedback email', value: data?.under_five_feedback_email ? 'Configured' : '—' },
      ],
    },
    {
      key: 'new_booking_notification_enabled',
      icon: <CalendarPlus className="h-5 w-5" />,
      title: 'New Booking Confirmation',
      description: 'When a new booking is created, notify the client and/or yourself via email and/or SMS.',
      enabled: newBookingEnabled,
      details: [
        { label: 'Client email', value: data?.new_booking_email_on !== false ? 'On' : 'Off' },
        { label: 'Client SMS', value: data?.new_booking_sms_on !== false ? 'On' : 'Off' },
      ],
    },
    {
      key: 'job_reminder_enabled',
      icon: <Bell className="h-5 w-5" />,
      title: 'Job Reminders',
      description: 'Remind the client (and optionally email yourself) before the scheduled job time.',
      enabled: jobReminderEnabled,
      details: [
        { label: 'Minutes before', value: String(data?.job_reminder_mins ?? 60) },
        { label: 'Also email', value: data?.job_reminder_email_on ? 'Yes' : 'No' },
      ],
    },
    {
      key: 'maintenance_upsell_enabled',
      icon: <Wrench className="h-5 w-5" />,
      title: 'Maintenance Upsell',
      description: 'Follow up after a completed job at set intervals with a link to re-book maintenance.',
      enabled: maintenanceEnabled,
      details: [
        { label: 'Days', value: (data?.maintenance_upsell_days ?? [14, 30, 45]).join(', ') },
        { label: 'Detail page URL', value: data?.maintenance_detail_url ? 'Configured' : '—' },
      ],
    },
    {
      key: 'abandoned_cart_enabled',
      icon: <ShoppingCart className="h-5 w-5" />,
      title: 'Abandoned Booking',
      description: 'Automatically follow up with visitors who started but did not complete a booking.',
      enabled: abandonedEnabled,
      details: [
        { label: 'Follow up after', value: `${data?.abandoned_cart_hours ?? 1} hour(s)` },
      ],
    },
  ]

  return (
    <div className="space-y-8 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div>
        <h1 className="page-title hidden md:block" style={{ color: 'var(--text-1)' }}>Automations</h1>
        <p className="mt-1 text-base" style={{ color: 'var(--text-2)' }}>
          Review follow-up, booking confirmations, reminders, and maintenance upsell — all configurable below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {automations.map((a) => (
          <Card key={a.key} className="transition-all duration-200 hover:translate-y-[-2px]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-[var(--accent)]">
                    {a.icon}
                  </div>
                  <CardTitle className="text-white text-base">{a.title}</CardTitle>
                </div>
                <AutomationToggle
                  enabled={a.enabled}
                  onToggle={(val) => toggleField(a.key, val)}
                  saving={savingField === a.key}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a.description}</p>
              <dl className="space-y-1">
                {a.details.map((d) => (
                  <div key={d.label} className="flex justify-between gap-2">
                    <span className="text-sm text-[var(--text-muted)]">{d.label}</span>
                    <span className="text-sm text-white">{d.value}</span>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="section-title text-white mb-4">Configure automations</h2>
        <AutomationsForm onSaved={refetch} />
      </section>
    </div>
  )
}
