'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { getNavItemsForRole } from '@/lib/nav-config'
import { crmPath } from '@/lib/crm-path'
import type { UserRole } from '@/types/database'
import { cn } from '@/lib/utils'

interface TopNavProps {
  role: UserRole
  userEmail?: string | null
  displayName?: string | null
}

export function TopNav({ role, userEmail, displayName }: TopNavProps) {
  const pathname = usePathname()
  const items = getNavItemsForRole(role)

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="flex h-32 items-center gap-6 px-4 lg:px-6">
        <Link href={crmPath('/dashboard')} className="flex items-center shrink-0">
          <Image src="/detailopslogo.png" alt="" width={108} height={108} className="h-[108px] w-auto drop-shadow-[0_0_20px_rgba(0,184,245,0.6)]" priority />
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--text-muted)] truncate max-w-[100px] lg:max-w-none">
            {displayName || userEmail || 'Testing'}
          </span>
          <span className="h-7 w-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
            {(displayName || userEmail || 'T').charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  )
}
