import { redirect } from 'next/navigation'
import { crmPath } from '@/lib/crm-path'

export default function SettingsSchedulePage() {
  redirect(crmPath('/settings/bookings'))
}
