'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu } from 'lucide-react'

interface BookingHeaderProps {
  businessName?: string
  logoUrl?: string | null
}

export function BookingHeader({ businessName, logoUrl }: BookingHeaderProps) {
  const displayName = businessName?.trim() || 'Book'
  const [logoError, setLogoError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const showLogo = logoUrl && logoUrl.trim() && !logoError

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between gap-2 px-4 h-14 border-b border-[var(--border)] bg-[var(--booking-bg,#212121)]"
      style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
    >
      <div className="flex items-center min-w-0 flex-1">
        {showLogo ? (
          <img
            src={logoUrl!.trim()}
            alt=""
            className="h-8 w-auto object-contain shrink-0 max-w-[180px]"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="text-lg font-semibold text-[var(--text)] tracking-tight truncate">{displayName}</span>
        )}
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((o) => !o)
          }}
          className="p-2 rounded-lg text-[var(--text-2)] hover:bg-[var(--booking-surface-hover)] hover:text-[var(--text)] transition-colors touch-manipulation"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <Menu className="h-6 w-6" />
        </button>
        {menuOpen && (
          <div
            className="absolute top-full right-0 mt-1 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--booking-bg,#212121)] shadow-xl py-2 z-50"
            style={{ right: 0 }}
          >
            <a
              href="/"
              className="block px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--booking-surface-hover)] no-underline"
              onClick={() => setMenuOpen(false)}
            >
              Back to DetailOps
            </a>
          </div>
        )}
      </div>
    </header>
  )
}
