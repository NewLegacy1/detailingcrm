import { createAuthClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'
import { JobDetailClient } from './job-detail-client'
import { JobDetailErrorBoundary } from './job-detail-error-boundary'

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.org_id ?? null

  // Fetch job by id (and org when available) so we match dashboard context and avoid join/RLS issues
  const jobQuery = orgId
    ? supabase.from('jobs').select('*').eq('id', id).eq('org_id', orgId)
    : supabase.from('jobs').select('*').eq('id', id)
  const { data: job, error: jobError } = await jobQuery.single()

  if (jobError || !job) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Link href={crmPath('/jobs')} className="hover:text-white">Jobs</Link>
          <span>/</span>
          <span>Job not found</span>
        </div>
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 md:p-10 text-center"
          style={{ maxWidth: 420, margin: '0 auto' }}
        >
          <p className="text-lg font-semibold text-[var(--text-1)] mb-2">
            This job is no longer available
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            It may have been deleted or cancelled. You can go back to the jobs list to view other jobs.
          </p>
          <Link
            href={crmPath('/jobs')}
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--accent)',
              color: '#000',
            }}
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  const jobRow = job as { customer_id?: string; vehicle_id?: string | null; service_id?: string | null }
  const [{ data: clientData }, { data: vehicleData }, { data: serviceData }, { data: photos }, { data: checklistItems }, { data: jobPayments }] = await Promise.all([
    jobRow.customer_id
      ? supabase.from('clients').select('id, name, email, phone, address').eq('id', jobRow.customer_id).maybeSingle()
      : { data: null },
    jobRow.vehicle_id
      ? supabase.from('vehicles').select('id, make, model, year, color').eq('id', jobRow.vehicle_id).maybeSingle()
      : { data: null },
    jobRow.service_id
      ? supabase.from('services').select('id, name, duration_mins, base_price').eq('id', jobRow.service_id).maybeSingle()
      : { data: null },
    supabase.from('job_photos').select('*').eq('job_id', id).order('created_at', { ascending: true }),
    supabase.from('job_checklist_items').select('*').eq('job_id', id).order('sort_order'),
    supabase.from('job_payments').select('*').eq('job_id', id).order('created_at', { ascending: false }),
  ])

  const jobNormalized = {
    ...job,
    clients: clientData ?? null,
    vehicles: vehicleData ?? null,
    services: serviceData ?? null,
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href={crmPath('/jobs')} className="hover:text-white">Jobs</Link>
        <span>/</span>
        <span className="text-white">{(jobNormalized.clients as { name?: string } | null)?.name ?? 'Job'}</span>
      </div>

      <JobDetailErrorBoundary>
        <JobDetailClient
          job={jobNormalized}
          photos={photos ?? []}
          checklistItems={checklistItems ?? []}
          jobPayments={jobPayments ?? []}
        />
      </JobDetailErrorBoundary>
    </div>
  )
}
