import { redirect } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'

export default function SettingsPage() {
  redirect(crmPath('/settings/profile'))
}
