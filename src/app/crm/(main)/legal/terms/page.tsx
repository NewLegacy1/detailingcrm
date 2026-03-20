import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { crmPath } from '@/lib/crm-path'

export default function TermsPage() {
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto" style={{ background: 'var(--bg)' }}>
      <Link
        href={crmPath('/settings/help')}
        className="inline-flex items-center justify-center md:justify-start gap-0 md:gap-1 rounded-lg min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 -ml-2 md:ml-0"
        aria-label="Back to Help and Legal"
      >
        <ChevronLeft className="h-8 w-8 md:h-4 md:w-4 shrink-0" strokeWidth={2.25} />
        <span className="hidden md:inline">Back to Help & Legal</span>
      </Link>
      <h1 className="page-title text-[var(--text)] mb-2">Terms of Service</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <div className="prose prose-invert max-w-none space-y-4 text-[var(--text-secondary)] text-sm">
        <p>
          This is a placeholder. Replace with your actual Terms of Service. Include: acceptance of terms, description of the service,
          user obligations, payment terms (if applicable), limitation of liability, termination, and governing law.
        </p>
        <p>
          You may wish to have these drafted or reviewed by a lawyer before going live.
        </p>
      </div>
    </div>
  )
}
