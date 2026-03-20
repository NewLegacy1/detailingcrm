import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirectTo=/onboarding')
  }
  /* Full-bleed onboarding scenes provide their own background */
  return <>{children}</>
}
