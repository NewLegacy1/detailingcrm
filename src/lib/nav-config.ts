import type { UserRole } from '@/types/database'
import { crmPath } from '@/lib/crm-path'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  UserCog,
  ClipboardList,
  Zap,
  Droplet,
  Megaphone,
  Tag,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  /** When true, show as disabled with "Coming soon" and no link. */
  comingSoon?: boolean
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: crmPath('/dashboard'), icon: LayoutDashboard, roles: ['pending', 'owner', 'admin', 'manager', 'technician'] },
  { label: 'Customers', href: crmPath('/customers'), icon: Users, roles: ['owner', 'admin', 'manager', 'technician'] },
  { label: 'Jobs', href: crmPath('/jobs'), icon: ClipboardList, roles: ['owner', 'admin', 'manager', 'technician'] },
  { label: 'Schedule', href: crmPath('/schedule'), icon: Calendar, roles: ['owner', 'admin', 'manager', 'technician'] },
  { label: 'Services', href: crmPath('/services'), icon: Wrench, roles: ['owner', 'admin'] },
  { label: 'Invoices', href: crmPath('/invoices'), icon: FileText, roles: ['owner', 'admin', 'manager'] },
  { label: 'Automations', href: crmPath('/automations'), icon: Zap, roles: ['owner', 'admin', 'manager'] },
  { label: 'Drip Marketing', href: crmPath('/drip-marketing'), icon: Droplet, roles: ['owner', 'admin', 'manager'] },
  { label: 'Promo codes', href: crmPath('/promo-codes'), icon: Tag, roles: ['owner', 'admin', 'manager'] },
  { label: 'Campaigns', href: crmPath('/campaigns'), icon: Megaphone, roles: ['owner', 'admin', 'manager'], comingSoon: true },
  { label: 'Team', href: crmPath('/team'), icon: UserCog, roles: ['owner', 'admin', 'manager'] },
  { label: 'Settings', href: crmPath('/settings'), icon: Settings, roles: ['owner', 'admin', 'manager'] },
  { label: 'Reports', href: crmPath('/reports'), icon: BarChart3, roles: ['owner', 'admin', 'manager'] },
]

/** When locationId is set (location manager), some Settings sub-pages are limited to their location (e.g. Schedule = location calendar). */
export function getNavItemsForRole(role: UserRole, locationId?: string | null): NavItem[] {
  const items = navItems.filter((item) => item.roles.includes(role))
  return items
}

export type NavGroupKey = 'Main' | 'Business' | 'Admin' | 'Marketing'

export const navGroups: { key: NavGroupKey; label: string; itemLabels: string[] }[] = [
  { key: 'Main', label: 'Main', itemLabels: ['Dashboard'] },
  { key: 'Business', label: 'Business', itemLabels: ['Customers', 'Jobs', 'Schedule', 'Services', 'Invoices'] },
  { key: 'Admin', label: 'Admin', itemLabels: ['Team', 'Reports', 'Settings'] },
  { key: 'Marketing', label: 'Marketing', itemLabels: ['Automations', 'Drip Marketing', 'Promo codes', 'Campaigns'] },
]

export function getNavGroupsForRole(role: UserRole, locationId?: string | null): { label: string; items: NavItem[] }[] {
  const items = getNavItemsForRole(role, locationId)
  return navGroups
    .map((g) => ({
      label: g.label,
      items: items.filter((i) => g.itemLabels.includes(i.label)),
    }))
    .filter((g) => g.items.length > 0)
}
