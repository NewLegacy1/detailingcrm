import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-3xl mx-auto bg-[#080c14]">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-[#5a6a80] hover:text-[#00b8f5] mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to sign in
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-[#5a6a80] text-sm mb-8">
        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <div className="prose prose-invert max-w-none space-y-4 text-[#94a3b8] text-sm">
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
