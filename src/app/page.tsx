/**
 * ROOT (/) — LANDING PAGE
 * Always show the landing at the domain. Logged-in users can use Log in to reach the CRM.
 */
import { Suspense } from 'react'
import { LandingABWrapper } from '@/components/landing/LandingABWrapper'

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080c14] flex items-center justify-center"><span className="text-[#5a6a80] text-sm">Loading…</span></div>}>
      <LandingABWrapper />
    </Suspense>
  )
}
