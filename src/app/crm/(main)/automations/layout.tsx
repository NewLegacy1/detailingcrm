import { redirect } from 'next/navigation'
import { getAuthAndPermissions } from '@/lib/permissions-server'
import { crmPath } from '@/lib/crm-path'

/** Managers cannot access Automations (org-wide toggles/copy); only owner and admin. */
export default async function AutomationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getAuthAndPermissions()
  if (auth?.role === 'manager' || auth?.locationId) {
    redirect(crmPath('/dashboard'))
  }
  return <>{children}</>
}
