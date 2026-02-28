'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { crmPath } from '@/lib/crm-path'
import {
  CreditCard,
  User,
  Users,
  Calendar,
  ListChecks,
  Zap,
  Palette,
  Shield,
  HelpCircle,
  Settings2,
  Receipt,
} from 'lucide-react'

const categories: { label: string; href: string; icon: typeof User; superAdminOnly?: boolean }[] = [
  { label: 'Profile', href: crmPath('/settings/profile'), icon: User },
  { label: 'Plan & Billing', href: crmPath('/settings/plan'), icon: Receipt },
  { label: 'Payments & Invoicing', href: crmPath('/settings/payments'), icon: CreditCard },
  { label: 'Team', href: crmPath('/settings/team'), icon: Users },
  { label: 'Schedule', href: crmPath('/settings/bookings'), icon: Calendar },
  { label: 'Checklist', href: crmPath('/settings/checklist'), icon: ListChecks },
  { label: 'Automations', href: crmPath('/settings/notifications'), icon: Zap },
  { label: 'Branding and Booking Portal', href: crmPath('/settings/branding'), icon: Palette },
  { label: 'Account & Security', href: crmPath('/settings/account'), icon: Shield },
  { label: 'Help & Legal', href: crmPath('/settings/help'), icon: HelpCircle },
  { label: 'Admin (CRM)', href: crmPath('/settings/admin'), icon: Settings2, superAdminOnly: true },
]

interface SettingsNavProps {
  isSuperAdmin?: boolean
}

export function SettingsNav({ isSuperAdmin = false }: SettingsNavProps) {
  const pathname = usePathname()
  const visibleCategories = categories.filter((item) => !item.superAdminOnly || isSuperAdmin)

  return (
    <nav className="space-y-0.5">
      {visibleCategories.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 min-h-[44px] text-sm font-medium transition-all duration-200',
              isActive
                ? 'border-l-2 border-[var(--accent)] bg-[var(--accent)]/10 text-white'
                : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
