import { redirect } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'

/** Legacy path: automations now live under the main app nav. */
export default function SettingsNotificationsRedirect() {
  redirect(crmPath('/automations'))
}
