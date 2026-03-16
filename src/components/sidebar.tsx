'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { getNavItemsForRole } from '@/lib/nav-config'
import { crmPath } from '@/lib/crm-path'
import type { UserRole } from '@/types/database'
import { cn } from '@/lib/utils'
import { X, PanelLeftClose, PanelLeft, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  role: UserRole
  userEmail?: string | null
  displayName?: string | null
  businessName?: string | null
  logoUrl?: string | null
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

const logoGlow = 'drop-shadow-[0_0_16px_rgba(0,184,245,0.4)]'

export function Sidebar({
  role,
  userEmail,
  displayName,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
  businessName,
  logoUrl,
}: SidebarProps) {
  const pathname = usePathname()
  const items = getNavItemsForRole(role)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onMobileOpenChange(false)}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/5 bg-[#000000] transition-[width,transform] duration-200 ease-out',
          'lg:translate-x-0',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header: DetailOps logo + collapse (desktop) / close (mobile) */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-white/5',
            collapsed ? 'justify-center px-0' : 'gap-3 px-4'
          )}
        >
          <Link
            href={crmPath('/dashboard')}
            className={cn(
              'flex items-center shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black rounded',
              collapsed ? 'justify-center' : 'gap-3'
            )}
            onClick={() => onMobileOpenChange(false)}
          >
            <Image
              src="/detailopslogo.png"
              alt=""
              width={collapsed ? 40 : 48}
              height={collapsed ? 40 : 48}
              className={cn(
                'w-auto shrink-0',
                collapsed ? 'h-9' : 'h-12',
                logoGlow
              )}
            />
            {!collapsed && (
              <span className="font-semibold text-white tracking-tight truncate">
                DetailOps
              </span>
            )}
          </Link>
          {!collapsed && (
            <>
              <button
                type="button"
                className="ml-auto lg:hidden p-2 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]"
                onClick={() => onMobileOpenChange(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="ml-auto hidden lg:flex p-2 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]"
                onClick={() => onCollapsedChange(true)}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onMobileOpenChange(false)}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'border-l-2 border-[var(--accent)] bg-[var(--accent)]/10 text-white'
                    : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn('h-4 w-4 shrink-0', collapsed ? '' : 'ml-0.5')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
          {collapsed && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                className="hidden lg:flex p-2 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]"
                onClick={() => onCollapsedChange(false)}
                aria-label="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </nav>

        {/* Divider + User block: avatar + name + Sign out */}
        <div className="shrink-0 border-t border-white/5" aria-hidden />
        <div
          className={cn(
            'shrink-0 flex items-center gap-2 p-3',
            collapsed ? 'justify-center' : ''
          )}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={displayName || businessName || 'User'}
              className={cn(
                'shrink-0 rounded-full object-cover border border-white/10',
                collapsed ? 'h-8 w-8' : 'h-9 w-9'
              )}
            />
          ) : (
            <span
              className={cn(
                'shrink-0 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-semibold border border-white/5',
                collapsed ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'
              )}
              title={collapsed ? (displayName || '') : undefined}
            >
              {(displayName || businessName || 'U').charAt(0).toUpperCase()}
            </span>
          )}
          {!collapsed && (
            <span className="text-sm text-[var(--text-secondary)] truncate flex-1 min-w-0 font-medium text-white">
              {displayName || userEmail || 'User'}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              'shrink-0 flex items-center rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-colors duration-200',
              collapsed ? 'p-2' : 'gap-2 px-2.5 py-2'
            )}
            title="Sign out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
