'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
})

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <div className={`min-h-screen bg-[#080c14] ${plusJakarta.className}`}>
      <div className="min-h-screen flex flex-col">
        <header
          className="flex items-center justify-between gap-3 px-4 py-4 md:px-10 md:py-6 border-b border-[rgba(0,184,245,0.08)] min-h-[56px] md:min-h-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          {/* Mobile: burger left */}
          <div className="flex md:hidden items-center shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center w-11 h-11 rounded-lg border border-[rgba(0,184,245,0.15)] bg-[rgba(255,255,255,0.03)] text-[#c8d5e8] touch-manipulation"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <Link href="/" className="flex-shrink-0 min-w-0 flex-1 md:flex-initial flex justify-center md:justify-start items-center">
            <Image
              src="/detailopslogo.png"
              alt="DetailOps"
              width={200}
              height={52}
              className="h-14 w-auto object-contain opacity-95 md:h-12 mx-auto md:mx-0"
              priority
            />
          </Link>

          {/* Desktop: Log in + Sign up */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-[0.9rem] text-[#8b9bb5] hover:text-[#c8d5e8] no-underline font-medium transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="py-2.5 px-5 rounded-full text-[0.9rem] font-medium text-white no-underline transition-[opacity,box-shadow] hover:opacity-95"
              style={{
                background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                boxShadow: '0 4px 16px rgba(0,184,245,0.35)',
              }}
            >
              Sign up free
            </Link>
          </div>

          {/* Mobile: Get started right */}
          <div className="flex md:hidden items-center shrink-0">
            <Link
              href="/login?mode=signup"
              className="py-2.5 px-4 rounded-full text-[0.85rem] font-semibold text-white no-underline shrink-0 transition-[opacity,box-shadow] active:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                boxShadow: '0 2px 12px rgba(0,184,245,0.3)',
              }}
            >
              Get started
            </Link>
          </div>
        </header>

        {/* Mobile menu overlay */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[280px] bg-[#0c111a] border-l border-[rgba(0,184,245,0.1)] shadow-xl md:hidden flex flex-col"
              style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="px-5 pt-2 pb-6 flex items-center justify-between border-b border-[rgba(0,184,245,0.08)]">
                <span className="text-[0.75rem] font-medium text-[#5a6a80] uppercase tracking-wider">Menu</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8b9bb5] hover:bg-white/5"
                  aria-label="Close menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col gap-3 p-4">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="py-3.5 px-4 rounded-xl text-[1rem] font-semibold text-[#00b8f5] no-underline text-center border-2 border-[rgba(0,184,245,0.4)] hover:bg-[rgba(0,184,245,0.08)] active:bg-[rgba(0,184,245,0.12)] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/login?mode=signup"
                  onClick={() => setMenuOpen(false)}
                  className="py-3.5 px-4 rounded-xl text-[1rem] font-semibold text-white no-underline text-center transition-[opacity,background] hover:opacity-95 active:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                    boxShadow: '0 2px 12px rgba(0,184,245,0.35)',
                  }}
                >
                  Get started
                </Link>
              </nav>
            </div>
          </>
        )}

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
          <h1 className="text-[2.2rem] md:text-[3rem] font-bold text-[#e8edf5] leading-tight tracking-tight max-w-[720px] mb-5">
            Run Your Detail Business
            <br />
            with <span className="font-light text-[#00b8f5] not-italic">Precision</span>
          </h1>
          <p className="text-[1rem] md:text-[1.1rem] text-[#5a6a80] leading-relaxed max-w-[520px] mb-10">
            Schedule jobs, manage crews, track payments, and grow your mobile detailing operation — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto py-[15px] px-8 rounded-full text-[0.95rem] font-medium text-white no-underline transition-[opacity,box-shadow] hover:opacity-95 text-center"
              style={{
                background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                boxShadow: '0 4px 20px rgba(0,184,245,0.35)',
              }}
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto py-[15px] px-8 rounded-full text-[0.95rem] font-medium text-[#00b8f5] no-underline border border-[rgba(0,184,245,0.35)] hover:bg-[rgba(0,184,245,0.08)] transition-colors text-center"
            >
              Log in
            </Link>
          </div>
        </main>

        <footer className="px-6 py-5 flex justify-center gap-6 text-[0.72rem] text-[#2a3548] border-t border-[rgba(0,184,245,0.06)]">
          <Link href="/crm/legal/privacy" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Privacy policy</Link>
          <Link href="/crm/legal/terms" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Terms &amp; conditions</Link>
        </footer>
      </div>
    </div>
  )
}
