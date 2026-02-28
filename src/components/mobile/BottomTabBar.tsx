'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Wrench,
  FileText,
  Zap,
  UserCog,
  BarChart3,
  Settings,
  MoreHorizontal,
  Plus,
} from 'lucide-react'
import { getNavItemsForRole } from '@/lib/nav-config'
import { crmPath } from '@/lib/crm-path'
import type { UserRole } from '@/types/database'

const PRIMARY_TABS = [
  { label: 'Home', href: crmPath('/dashboard'), icon: LayoutDashboard },
  { label: 'Schedule', href: crmPath('/schedule'), icon: Calendar },
  { label: 'Customers', href: crmPath('/customers'), icon: Users },
] as const

const MORE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Jobs: ClipboardList,
  Services: Wrench,
  Invoices: FileText,
  Automations: Zap,
  Team: UserCog,
  Reports: BarChart3,
  Settings: Settings,
}

interface BottomTabBarProps {
  role: UserRole
  jobCount?: number
  invoiceCount?: number
  subscriptionPlan?: 'starter' | 'pro' | null
}

export function BottomTabBar({ role, jobCount = 0, invoiceCount = 0, subscriptionPlan }: BottomTabBarProps) {
  const pathname = usePathname()
  const allItems = getNavItemsForRole(role)
  const moreItems = allItems.filter(
    (i) => !['Dashboard', 'Customers', 'Schedule'].includes(i.label)
  )
  const [moreOpen, setMoreOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const createRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [moreOpen])

  useEffect(() => {
    if (!createOpen) return
    const onOutside = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [createOpen])

  const isActive = (href: string) =>
    pathname === href || (href !== crmPath('/dashboard') && pathname.startsWith(href + '/'))

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around min-h-[56px] border-t bg-[var(--surface-1)]"
      style={{ borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      {/* Create new – plus in accent circle (first on left) */}
      <div className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px]" ref={createRef}>
        <button
          type="button"
          onClick={() => {
            setMoreOpen(false)
            setCreateOpen((o) => !o)
          }}
          className="flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-transform active:scale-95"
          style={{ background: 'var(--accent)', color: 'white' }}
          aria-expanded={createOpen}
          aria-haspopup="true"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
        {createOpen && (
          <div
            className="fixed left-4 right-4 z-50 rounded-xl border shadow-lg overflow-hidden py-2 min-w-[200px]"
            style={{
              background: 'var(--surface-1)',
              borderColor: 'var(--border)',
              bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 8px)',
            }}
          >
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
              Create new
            </p>
            <Link
              href={crmPath('/jobs/new')}
              onClick={() => setCreateOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-1)' }}
            >
              <ClipboardList size={18} style={{ color: 'var(--text-2)' }} />
              New Job
            </Link>
            <Link
              href={crmPath('/customers')}
              onClick={() => setCreateOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-1)' }}
            >
              <Users size={18} style={{ color: 'var(--text-2)' }} />
              New Customer
            </Link>
            <Link
              href={crmPath('/services')}
              onClick={() => setCreateOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-1)' }}
            >
              <Wrench size={18} style={{ color: 'var(--text-2)' }} />
              New Service
            </Link>
            <div className="my-1 h-px" style={{ background: 'var(--border)' }} />
            <Link
              href={crmPath('/invoices')}
              onClick={() => setCreateOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text-1)' }}
            >
              <FileText size={18} style={{ color: 'var(--text-2)' }} />
              New Invoice
            </Link>
          </div>
        )}
      </div>
      {PRIMARY_TABS.map((tab) => {
        const Icon = tab.icon
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 py-2 text-xs font-medium transition-colors"
            style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            {tab.label}
          </Link>
        )
      })}
      <div className="relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px]" ref={ref}>
        <button
          type="button"
          onClick={() => {
            setCreateOpen(false)
            setMoreOpen((o) => !o)
          }}
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors min-h-[44px] min-w-[44px]"
          style={{
            color: moreItems.some((i) => isActive(i.href)) ? 'var(--accent)' : 'var(--text-3)',
          }}
          aria-expanded={moreOpen}
          aria-haspopup="true"
        >
          <MoreHorizontal size={22} />
          More
        </button>
        {moreOpen && moreItems.length > 0 && (
          <div
            className="absolute bottom-full right-0 left-auto mb-2 w-48 rounded-xl border shadow-lg overflow-hidden"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
          >
            <ul className="py-2">
              {moreItems.map((item) => {
                const Icon = MORE_ICONS[item.label] ?? Settings
                const active = isActive(item.href)
                const showCount = (item.label === 'Invoices' && invoiceCount > 0) || (item.label === 'Jobs' && jobCount > 0)
                const count = item.label === 'Jobs' ? jobCount : item.label === 'Invoices' ? invoiceCount : 0
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors"
                      style={{
                        color: active ? 'var(--accent)' : 'var(--text-1)',
                        background: active ? 'var(--accent-dim)' : 'transparent',
                      }}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {item.label}
                      {showCount && (
                        <span
                          className="ml-auto text-xs rounded-full px-2 py-0.5"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </nav>
  )
}
