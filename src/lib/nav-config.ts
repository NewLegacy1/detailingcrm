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
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: crmPath('/dashboard'), icon: LayoutDashboard, roles: ['pending', 'owner', 'admin', 'manager', 'technician'] },
  { label: 'Customers', href: crmPath('/customers'), icon: Users, roles: ['owner', 'admin', 'manager', 'technician'] },
  { label: 'Jobs', href: crmPath('/jobs'), icon: ClipboardList, roles: ['owner', 'admin', 'manager', 'technician'] },
  { label: 'Schedule', href: crmPath('/schedule'), icon: Calendar, roles: ['owner', 'admin', 'manager', 'technician'] },
  { label: 'Services', href: crmPath('/services'), icon: Wrench, roles: ['owner', 'admin'] },
  { label: 'Invoices', href: crmPath('/invoices'), icon: FileText, roles: ['owner', 'admin', 'manager'] },
  { label: 'Automations', href: crmPath('/automations'), icon: Zap, roles: ['owner', 'admin', 'manager'] },
  { label: 'Team', href: crmPath('/team'), icon: UserCog, roles: ['owner', 'admin', 'manager'] },
  { label: 'Reports', href: crmPath('/reports'), icon: BarChart3, roles: ['owner', 'admin'] },
  { label: 'Settings', href: crmPath('/settings'), icon: Settings, roles: ['owner'] },
]

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role))
}

export type NavGroupKey = 'Main' | 'Business' | 'Admin'

export const navGroups: { key: NavGroupKey; label: string; itemLabels: string[] }[] = [
  { key: 'Main', label: 'Main', itemLabels: ['Dashboard'] },
  { key: 'Business', label: 'Business', itemLabels: ['Customers', 'Jobs', 'Schedule', 'Services', 'Invoices'] },
  { key: 'Admin', label: 'Admin', itemLabels: ['Automations', 'Team', 'Reports', 'Settings'] },
]

export function getNavGroupsForRole(role: UserRole): { label: string; items: NavItem[] }[] {
  const items = getNavItemsForRole(role)
  return navGroups
    .map((g) => ({
      label: g.label,
      items: items.filter((i) => g.itemLabels.includes(i.label)),
    }))
    .filter((g) => g.items.length > 0)
}
