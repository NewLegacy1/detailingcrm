import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { crmPath } from '@/lib/crm-path'
import { createAuthClient } from '@/lib/supabase/server'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { GoogleCalendarCard } from '@/components/settings/google-calendar-card'
import { ScheduleHoursForm } from '@/components/settings/schedule-hours-form'
import { TimezoneForm } from '@/components/settings/timezone-form'
import { ShopLocationSettings } from '@/components/settings/shop-location-settings'
import { PerLocationScheduleSection } from '@/components/settings/per-location-schedule-section'
import { IntegrationsAlerts } from '../integrations/integrations-alerts'

export default async function SettingsBookingsPage() {
  const auth = await getAuthAndPermissions()
  const supabase = await createAuthClient()
  let orgId = auth?.orgId ?? null
  if (!orgId && auth) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  let isPro = false
  if (orgId) {
    const res = await supabase.from('organizations').select('subscription_plan').eq('id', orgId).single()
    isPro = res.data?.subscription_plan === 'pro'
  }

  return (
    <div className="space-y-8">
      <IntegrationsAlerts />
      <div>
        <h1 className="page-title text-[var(--text)]">Schedule</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Connect Google Calendar to sync jobs and customize how your schedule and calendar display.
        </p>
        <Link
          href={crmPath('/schedule')}
          className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent)]/80"
        >
          <Calendar className="h-4 w-4" />
          View schedule
        </Link>
      </div>

      <GoogleCalendarCard />

      <section>
        <h2 className="section-title text-[var(--text)] mb-1">Timezone</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Your business timezone. Used for &quot;today&quot; on the dashboard and jobs day view, and when creating or editing jobs so the time you pick (e.g. 11:30 AM) is saved and displayed correctly on the schedule.
        </p>
        <TimezoneForm />
      </section>

      <section>
        <h2 className="section-title text-[var(--text)] mb-1">Service hours &amp; booking availability</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Service hours set the time range on the calendar and <strong>when clients can book</strong> on your public booking page. Only slots within these hours are offered. The travel buffer prevents overlapping or back-to-back bookings.
        </p>
        <ScheduleHoursForm />
      </section>

      <PerLocationScheduleSection />

      <ShopLocationSettings isPro={isPro} />
    </div>
  )
}
