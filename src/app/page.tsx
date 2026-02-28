/**
 * ROOT (/) — LANDING PAGE FOR GUESTS
 * - Logged out: show the landing page (company info, Get Started, Log in).
 * - Logged in: redirect to /crm/dashboard.
 *
 * The landing you built with full company info should live at public/index.html.
 * If you add that file, we can switch / to serve it for guests via middleware.
 */
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'
import { LandingABWrapper } from '@/components/landing/LandingABWrapper'
import { crmPath } from '@/lib/crm-path'

export default async function HomePage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(crmPath('/dashboard'))
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080c14] flex items-center justify-center"><span className="text-[#5a6a80] text-sm">Loading…</span></div>}>
      <LandingABWrapper />
    </Suspense>
  )
}
