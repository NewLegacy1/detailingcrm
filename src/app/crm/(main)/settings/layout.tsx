import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createAuthClient } from '@/lib/supabase/server'
import { SettingsNav } from '@/components/settings/settings-nav'
import { crmPath } from '@/lib/crm-path'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
    : { data: null }

  const isSuperAdmin = profile?.is_super_admin ?? false

  return (
    <div className="p-4 lg:p-8" style={{ background: 'var(--bg)' }}>
      <div className="mb-4 lg:mb-6">
        <Link
          href={crmPath('/dashboard')}
          className="inline-flex items-center gap-1 text-sm hover:opacity-90"
          style={{ color: 'var(--text-2)' }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to app
        </Link>
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="shrink-0 lg:w-56">
          <div className="lg:sticky lg:top-8">
            <h2 className="section-label mb-3 hidden lg:block">
              Settings
            </h2>
            <SettingsNav isSuperAdmin={isSuperAdmin} />
          </div>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
