'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, LogOut } from 'lucide-react'
import { CRM_BASE, crmPath } from '@/lib/crm-path'

const TITLES: Record<string, string> = {
  [CRM_BASE + '/dashboard']: 'Dashboard',
  [CRM_BASE + '/jobs']: 'Jobs',
  [CRM_BASE + '/customers']: 'Customers',
  [CRM_BASE + '/schedule']: 'Schedule',
  [CRM_BASE + '/services']: 'Services',
  [CRM_BASE + '/invoices']: 'Invoices',
  [CRM_BASE + '/automations']: 'Automations',
  [CRM_BASE + '/team']: 'Team',
  [CRM_BASE + '/reports']: 'Reports',
  [CRM_BASE + '/settings']: 'Settings',
}

function getTitle(pathname: string): string {
  if (pathname === CRM_BASE + '/dashboard') return 'Dashboard'
  for (const [path, title] of Object.entries(TITLES)) {
    if (path !== CRM_BASE + '/dashboard' && pathname === path) return title
    if (path !== CRM_BASE + '/dashboard' && pathname.startsWith(path + '/')) return title
  }
  const segment = pathname.replace(CRM_BASE + '/', '').split('/').filter(Boolean)[0]
  if (segment) return segment.charAt(0).toUpperCase() + segment.slice(1)
  return 'App'
}

interface MobileHeaderProps {
  displayName?: string | null
  logoUrl?: string | null
}

export function MobileHeader({ displayName, logoUrl }: MobileHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const title = getTitle(pathname)
  const segments = pathname.split('/').filter(Boolean)
  const showBack = segments.length > 1

  useEffect(() => {
    if (!menuOpen) return
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = (displayName ?? 'User').split(/\s+/).map((s) => s[0].toUpperCase()).join('').slice(0, 2) || 'U'

  return (
    <header
      className="md:hidden sticky top-0 z-30 flex items-center justify-between min-h-[52px] px-4 border-b shrink-0"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-1)' }}
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {!showBack && (
          <Link href={crmPath('/dashboard')} className="flex items-center shrink-0 -ml-1" aria-label="DetailOps home">
            <Image src="/detailopslogo.png" alt="" width={36} height={36} className="h-9 w-auto object-contain" />
          </Link>
        )}
        <h1 className="text-lg font-semibold truncate ml-1" style={{ color: 'var(--text-1)' }}>
          {title}
        </h1>
      </div>
      <div className="relative flex items-center shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full overflow-hidden border transition-colors"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          {logoUrl?.trim() ? (
            <img src={logoUrl} alt="" className="w-8 h-8 object-cover" />
          ) : (
            <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>
              {initials}
            </span>
          )}
        </button>
        {menuOpen && (
          <div
            className="absolute top-full right-0 mt-2 w-56 rounded-xl border shadow-lg py-2"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
          >
            <Link
              href={crmPath('/settings/profile')}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 border-b hover:bg-[var(--surface-2)] transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                {displayName ?? 'User'}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); handleSignOut(); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors text-left"
              style={{ color: 'var(--text-2)' }}
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
