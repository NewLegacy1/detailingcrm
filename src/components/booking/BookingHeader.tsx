'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Menu, Star } from 'lucide-react'

interface BookingHeaderProps {
  businessName?: string
  logoUrl?: string | null
  /** Org business website; used for "Back to [business name]" link in menu. */
  businessWebsite?: string | null
  /** City or area name for review line (e.g. "Hamilton"). Set in Settings → Branding. */
  serviceAreaLabel?: string | null
  /** When set, show "Signed in as …" and Sign out; otherwise show Sign in / Create account. */
  bookingUser?: { email?: string } | null
  /** When set and signed in, show customer name and link to profile (e.g. for /book/[slug]). */
  profileLinkSlug?: string | null
  customerName?: string | null
  onSignInClick?: () => void
  onSignUpClick?: () => void
  onSignOut?: () => void
}

export function BookingHeader({ businessName, logoUrl, businessWebsite, serviceAreaLabel, bookingUser, profileLinkSlug, customerName, onSignInClick, onSignUpClick, onSignOut }: BookingHeaderProps) {
  const displayName = businessName?.trim() || 'Book'
  const [logoError, setLogoError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const showLogo = logoUrl && logoUrl.trim() && !logoError
  const cityOrArea = typeof serviceAreaLabel === 'string' ? serviceAreaLabel.trim() : ''
  const showReviewLine = cityOrArea.length > 0
  const signedIn = !!bookingUser

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
      <div className="flex items-center min-w-0 flex-1 gap-3">
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
        {showReviewLine && (
          <span className="hidden sm:inline-flex items-center gap-1 shrink-0 text-xs text-[var(--text-2)]">
            <Star className="h-3.5 w-3 fill-[var(--accent)] text-[var(--accent)]" aria-hidden />
            <span>Top rated in {cityOrArea}</span>
          </span>
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
            {signedIn ? (
              <>
                <p className="px-4 py-2 text-xs text-[var(--text-muted)] truncate max-w-[200px]" title={bookingUser?.email}>
                  {bookingUser?.email ? `Signed in as ${bookingUser.email}` : 'Signed in'}
                </p>
                {profileLinkSlug && (
                  <Link
                    href={`/book/${profileLinkSlug}/profile`}
                    className="block w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--booking-surface-hover)] no-underline"
                    onClick={() => setMenuOpen(false)}
                  >
                    {customerName?.trim() ? `Profile — ${customerName.trim()}` : 'Your profile'}
                  </Link>
                )}
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--booking-surface-hover)]"
                  onClick={() => { onSignOut?.(); setMenuOpen(false) }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--booking-surface-hover)]"
                  onClick={() => { onSignInClick?.(); setMenuOpen(false) }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--booking-surface-hover)]"
                  onClick={() => { onSignUpClick?.(); setMenuOpen(false) }}
                >
                  Create account
                </button>
              </>
            )}
            <a
              href={businessWebsite?.trim() && (businessWebsite.startsWith('http://') || businessWebsite.startsWith('https://')) ? businessWebsite.trim() : '/'}
              target={businessWebsite?.trim() && businessWebsite.startsWith('http') ? '_blank' : undefined}
              rel={businessWebsite?.trim() && businessWebsite.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="block px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--booking-surface-hover)] no-underline border-t border-[var(--border)] mt-1 pt-2"
              onClick={() => setMenuOpen(false)}
            >
              Back to {displayName}
            </a>
          </div>
        )}
      </div>
    </header>
  )
}
