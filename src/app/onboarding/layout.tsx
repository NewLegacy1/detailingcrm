import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'

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
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-start">
      {children}
    </div>
  )
}
