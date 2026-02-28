import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { NewJobForm } from './new-job-form'

export default function NewJobPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href={crmPath('/jobs')} className="hover:text-[var(--text)]">Jobs</Link>
        <span>/</span>
        <span className="text-[var(--text)]">New job</span>
      </div>
      <h1 className="text-xl font-bold text-[var(--text)]">New job</h1>
      <NewJobForm />
    </div>
  )
}
