import Link from 'next/link'
import { CreditCard, Calendar } from 'lucide-react'
import { crmPath } from '@/lib/crm-path'
import { IntegrationsAlerts } from './integrations-alerts'

export default function SettingsIntegrationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title text-[var(--text)]">Integrations</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Connect external services. Configure each in its settings section.
      </p>
      <IntegrationsAlerts />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={crmPath('/settings/payments')}
          className="card p-6 flex items-start gap-4 hover:border-[var(--accent)]/40 transition-colors"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="section-title text-[var(--text)]">Stripe</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Payments & Invoicing — connect Stripe to send invoices and accept payments.
            </p>
            <span className="text-sm text-[var(--accent)] mt-2 inline-block">Configure →</span>
          </div>
        </Link>
        <Link
          href={crmPath('/settings/bookings')}
          className="card p-6 flex items-start gap-4 hover:border-[var(--accent)]/40 transition-colors"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="section-title text-[var(--text)]">Google Calendar</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Schedule — sync jobs to Google Calendar and set calendar hours.
            </p>
            <span className="text-sm text-[var(--accent)] mt-2 inline-block">Configure →</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
