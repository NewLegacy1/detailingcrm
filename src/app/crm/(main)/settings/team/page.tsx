import { redirect } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'

/** Team is managed from the sidebar (not inside Settings). */
export default function SettingsTeamRedirect() {
  redirect(crmPath('/team'))
}
