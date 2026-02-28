import { TeamList } from '@/components/settings/team-list'
import { RoleEditor } from '@/components/settings/role-editor'
import { createAuthClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PLAN_PAGE_PATH } from '@/components/settings/plan-page-actions'

export default async function SettingsTeamPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    : { data: null }

  let isStarter = false
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', profile.org_id)
      .single()
    isStarter = org?.subscription_plan === 'starter'
  }

  if (isStarter) {
    return (
      <div className="space-y-8">
        <h1 className="page-title text-[var(--text)]">Team & Roles</h1>
        <div className="card p-6 border-[var(--accent)]/30 bg-[var(--accent)]/5 space-y-4">
          <h2 className="section-title text-[var(--text)]">Pro feature</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Team and crew management is a Pro feature. Add members, assign roles, and control what each person can see.
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
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="page-title text-[var(--text)]">Team & Roles</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Manage team members and their roles. Only owners can change roles and disconnect Stripe.
      </p>

      <section>
        <h2 className="section-title text-[var(--text)] mb-3">Team members</h2>
        <TeamList />
      </section>

      <section>
        <RoleEditor />
      </section>
    </div>
  )
}
