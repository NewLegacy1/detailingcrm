import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'
import { crmPath } from '@/lib/crm-path'

export default async function SettingsAdminPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) redirect(crmPath('/settings'))

  return (
    <div className="space-y-6">
      <h1 className="page-title text-[var(--text)]">Admin (CRM)</h1>
      <p className="text-sm text-[var(--text-muted)]">
        This section is only visible to you. Use it to configure the CRM application itself (feature flags, system defaults, etc.). Business owners and team members use the rest of Settings for their company profile, team, and integrations.
      </p>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <p className="text-sm text-[var(--text-muted)]">
          CRM configuration options can be added here (e.g. default org, global feature toggles, maintenance mode).
        </p>
      </div>
    </div>
  )
}
