import { createAuthClient } from '@/lib/supabase/server'
import { ChecklistSettings } from './checklist-settings'

export default async function ChecklistSettingsPage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  let orgId: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    orgId = profile?.org_id ?? null
  }
  const { data: items } = orgId
    ? await supabase.from('organization_default_checklist').select('*').eq('org_id', orgId).order('sort_order')
    : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title text-[var(--text)]">Default job checklist</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">These items are added to every new job. Customize per job on the job detail page.</p>
      </div>
      <ChecklistSettings orgId={orgId} initialItems={items ?? []} />
    </div>
  )
}
