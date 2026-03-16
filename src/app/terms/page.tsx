import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-3xl mx-auto bg-[#080c14]">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-[#5a6a80] hover:text-[#00b8f5] mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to sign in
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-[#5a6a80] text-sm mb-8">
        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <div className="prose prose-invert max-w-none space-y-4 text-[#94a3b8] text-sm">
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
