import { createAuthClient } from '@/lib/supabase/server'
import { TeamTable } from './team-table'
import Link from 'next/link'
import { UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLAN_PAGE_PATH } from '@/components/settings/plan-page-actions'

export default async function TeamPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: myProfile } = user
    ? await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    : { data: null }

  let subscriptionPlan: string | null = null
  if (myProfile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', myProfile.org_id)
      .single()
    subscriptionPlan = org?.subscription_plan ?? null
  }

  const isStarter = subscriptionPlan === 'starter'

  if (isStarter) {
    return (
      <div className="flex flex-col items-center justify-center p-8 lg:p-12 text-center" style={{ background: 'var(--bg)', minHeight: '60vh' }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] mb-6">
          <UserCog className="h-8 w-8" />
        </div>
        <h1 className="page-title mb-2" style={{ color: 'var(--text-1)' }}>Team</h1>
        <p className="text-[var(--text-secondary)] max-w-md mb-8">
          Team and crew management is a Pro feature. Add members, assign roles, and control what each person can see — upgrade to unlock.
        </p>
        <Link href={PLAN_PAGE_PATH}>
          <Button
            style={{
              background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
              boxShadow: '0 4px 14px rgba(0,184,245,0.35)',
            }}
          >
            Upgrade to Pro
          </Button>
        </Link>
      </div>
    )
  }

  const { data: profiles } = myProfile?.org_id
    ? await supabase.from('profiles').select('*').eq('org_id', myProfile.org_id).order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="space-y-6 p-6 lg:p-8" style={{ background: 'var(--bg)' }}>
      <h1 className="page-title hidden md:block" style={{ color: 'var(--text-1)' }}>Team</h1>
      <TeamTable initialProfiles={profiles ?? []} />
    </div>
  )
}
