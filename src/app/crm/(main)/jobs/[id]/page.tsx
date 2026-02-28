import { createAuthClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { JobDetailClient } from './job-detail-client'
import { JobDetailErrorBoundary } from './job-detail-error-boundary'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createAuthClient()

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      *,
      clients(id, name, email, phone, address),
      vehicles(id, make, model, year, color),
      services(id, name, duration_mins, base_price)
    `)
    .eq('id', id)
    .single()

  if (jobError || !job) notFound()

  // Normalize relations (Supabase can return single object or array)
  const jobNormalized = {
    ...job,
    clients: Array.isArray(job.clients) ? job.clients[0] ?? null : job.clients,
    vehicles: Array.isArray(job.vehicles) ? job.vehicles[0] ?? null : job.vehicles,
    services: Array.isArray(job.services) ? job.services[0] ?? null : job.services,
  }

  const [{ data: photos }, { data: checklistItems }, { data: jobPayments }] = await Promise.all([
    supabase.from('job_photos').select('*').eq('job_id', id).order('created_at', { ascending: true }),
    supabase.from('job_checklist_items').select('*').eq('job_id', id).order('sort_order'),
    supabase.from('job_payments').select('*').eq('job_id', id).order('created_at', { ascending: false }),
  ])

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
