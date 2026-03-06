import { createAuthClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { Card } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/ui/empty-state'
import type { JobStatusType } from '@/components/ui/status-pill'

export async function DetailingTechDashboard({ userId }: { userId: string }) {
  const supabase = await createAuthClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const { data: myJobs } = await supabase
    .from('jobs')
    .select('id, scheduled_at, status, clients(name), services(name)')
    .eq('assigned_tech_id', userId)
    .gte('scheduled_at', todayStart.toISOString())
    .lt('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at', { ascending: true })

  const todayLabel = todayStart.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-8">
      <h1 className="page-title text-white">Dashboard</h1>
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="section-label">{todayLabel}</h2>
          <Link
            href={crmPath('/schedule')}
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent)]/80 shrink-0"
          >
            Schedule →
          </Link>
        </div>
        {myJobs && myJobs.length > 0 ? (
          <ul className="space-y-2">
            {myJobs.map(
              (job: {
                id: string
                scheduled_at: string
                status: string
                clients: { name: string } | { name: string }[] | null
                services: { name: string } | { name: string }[] | null
              }) => {
                const client = Array.isArray(job.clients)
                  ? job.clients[0]
                  : job.clients
                const service = Array.isArray(job.services)
                  ? job.services[0]
                  : job.services
                return (
                  <li key={job.id}>
                    <Card className="transition-all duration-200 hover:translate-y-[-2px]">
                      <Link href={crmPath(`/jobs/${job.id}`)} className="block p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="text-sm tabular-nums text-[var(--text-muted)] w-14 shrink-0">
                              {new Date(job.scheduled_at).toLocaleTimeString(
                                'en-US',
                                { hour: 'numeric', minute: '2-digit' }
                              )}
                            </span>
                            <div>
                              <p className="font-medium text-white">
                                {client?.name ?? '—'}
                              </p>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {service?.name ?? 'Service'}
                              </p>
                            </div>
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
              }
            )}
          </ul>
        ) : (
          <EmptyState
            iconName="ClipboardList"
            headline="No jobs today"
            subtext="Jobs assigned to you for today will appear here."
            ctaLabel="View schedule"
            ctaHref={crmPath('/schedule')}
          />
        )}
      </section>
    </div>
  )
}
