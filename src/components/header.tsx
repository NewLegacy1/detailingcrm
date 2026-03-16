'use client'

import { Menu } from 'lucide-react'

interface HeaderProps {
  userEmail?: string | null
  displayName?: string | null
  onMenuClick?: () => void
}

export function Header({ userEmail, displayName, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)]/90 backdrop-blur-md px-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1 lg:flex-none lg:w-[260px]" />
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[var(--text-muted)] truncate max-w-[140px] lg:max-w-none">
          {displayName || userEmail || 'Testing'}
        </span>
        <div className="h-8 w-8 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
          {(displayName || userEmail || 'T').charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
