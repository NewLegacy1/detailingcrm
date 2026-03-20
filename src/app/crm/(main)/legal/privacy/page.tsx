import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { crmPath } from '@/lib/crm-path'

export default function PrivacyPage() {
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
      <h1 className="page-title text-[var(--text)] mb-2">Privacy Policy</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <div className="prose prose-invert max-w-none space-y-4 text-[var(--text-secondary)] text-sm">
        <p>
          This is a placeholder. Replace with your actual Privacy Policy. Include: what data you collect (account, customers, jobs, payment info),
          how you use it, who you share it with (e.g. Stripe, Supabase, Google), how long you keep it, user rights (access, deletion),
          cookies, and how to contact you about privacy.
        </p>
        <p>
          A privacy policy is required if you collect personal data. Consider having it reviewed by a lawyer.
        </p>
      </div>
    </div>
  )
}
