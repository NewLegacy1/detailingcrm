import { createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountSecurityForm } from './account-security-form'

export default async function AccountSecurityPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/crm/settings/account')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title text-[var(--text)]">Account & Security</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Manage your sign-in email, password, and security preferences.
        </p>
      </div>
      <AccountSecurityForm initialEmail={user.email ?? ''} />
    </div>
  )
}
