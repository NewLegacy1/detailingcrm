'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['italic'],
})

export function LandingVariantB() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [gateSubmitted, setGateSubmitted] = useState(false)
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessName.trim() || !email.trim()) return
    const first = businessName.trim().split(/\s+/)[0] || businessName.trim()
    setFirstName(first)
    setGateSubmitted(true)
  }

  const iframeSrc = gateSubmitted
    ? `/book/demo?business=${encodeURIComponent(businessName.trim())}`
    : ''
  const signupUrl = `/signup?business=${encodeURIComponent(businessName.trim())}&email=${encodeURIComponent(email.trim())}`

  return (
    <div className={`min-h-screen bg-[#080c14] ${plusJakarta.className}`}>
      <div className="min-h-screen flex flex-col">
        <header
          className="flex items-center justify-between gap-3 px-4 py-4 md:px-10 md:py-6 border-b border-[rgba(0,184,245,0.08)] min-h-[56px] md:min-h-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
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
              width={120}
              height={48}
              className="h-12 w-auto object-contain opacity-95 md:h-10 mx-auto md:mx-0"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-[0.9rem] text-[#8b9bb5] hover:text-[#c8d5e8] no-underline font-medium transition-colors">
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
                <button type="button" onClick={() => setMenuOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8b9bb5] hover:bg-white/5" aria-label="Close menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <nav className="flex flex-col gap-3 p-4">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="py-3.5 px-4 rounded-xl text-[1rem] font-semibold text-[#00b8f5] no-underline text-center border-2 border-[rgba(0,184,245,0.4)] hover:bg-[rgba(0,184,245,0.08)] active:bg-[rgba(0,184,245,0.12)] transition-colors">
                  Log in
                </Link>
                <Link href="/login?mode=signup" onClick={() => setMenuOpen(false)} className="py-3.5 px-4 rounded-xl text-[1rem] font-semibold text-white no-underline text-center transition-[opacity,background] hover:opacity-95 active:opacity-90" style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 2px 12px rgba(0,184,245,0.35)' }}>
                  Get started
                </Link>
              </nav>
            </div>
          </>
        )}

        <main className="flex-1 flex flex-col items-center px-6 py-12 md:py-16">
          <h1 className="text-center text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-tight tracking-tight max-w-[900px] mb-4">
            <span className="text-[#00b8f5]">Detail More.</span>{' '}
            <span className={`text-white italic font-normal ${fraunces.className}`}>Stress Less.</span>
          </h1>
          <p className="text-center text-[1rem] md:text-[1.1rem] text-[#5a6a80] leading-relaxed max-w-[640px] mb-10">
            The CRM made for detailers — instant online booking, automated everything, loyal customers on repeat, and your business finally running like a machine.
          </p>

          {!gateSubmitted ? (
            <form
              onSubmit={handleGateSubmit}
              className="w-full max-w-[420px] rounded-2xl border border-[rgba(0,184,245,0.15)] bg-[rgba(255,255,255,0.02)] backdrop-blur-sm p-6 md:p-8 shadow-xl"
            >
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business name"
                  required
                  className="w-full py-3.5 px-5 rounded-xl border border-[rgba(0,184,245,0.2)] bg-[#111827] text-[0.95rem] text-[#c8d5e8] placeholder:text-[#3a4a60] outline-none focus:border-[rgba(0,184,245,0.5)] focus:ring-2 focus:ring-[rgba(0,184,245,0.15)] transition-all"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full py-3.5 px-5 rounded-xl border border-[rgba(0,184,245,0.2)] bg-[#111827] text-[0.95rem] text-[#c8d5e8] placeholder:text-[#3a4a60] outline-none focus:border-[rgba(0,184,245,0.5)] focus:ring-2 focus:ring-[rgba(0,184,245,0.15)] transition-all"
                />
                <button
                  type="submit"
                  className="w-full py-[15px] rounded-xl text-[0.95rem] font-semibold text-white transition-[opacity,box-shadow] hover:opacity-95 active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                    boxShadow: '0 4px 20px rgba(0,184,245,0.35)',
                  }}
                >
                  Continue
                </button>
              </div>
            </form>
          ) : (
            <div className="w-full max-w-[900px] flex flex-col items-center gap-6">
              <p className="text-[1.1rem] text-[#8b9bb5]">Welcome, {firstName}!</p>
              <div className="w-full rounded-xl overflow-hidden border border-[rgba(0,184,245,0.15)] bg-[#0c111a] shadow-2xl">
                <div className="px-4 py-2.5 bg-[#0a0f1c] border-b border-[rgba(0,184,245,0.08)] flex items-center gap-2">
                  <span className="text-[0.7rem] text-[#5a6a80] font-mono">detailops.io/book/{businessName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'your-business'}</span>
                </div>
                <div className="aspect-[16/10] min-h-[320px] bg-[#212121]">
                  <iframe
                    src={iframeSrc}
                    title="Booking demo"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
              <Link
                href={signupUrl}
                className="inline-flex py-[15px] px-8 rounded-full text-[0.95rem] font-semibold text-white no-underline transition-[opacity,box-shadow] hover:opacity-95 text-center"
                style={{
                  background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                  boxShadow: '0 4px 20px rgba(0,184,245,0.35)',
                }}
              >
                Continue to sign up
              </Link>
            </div>
          )}
        </main>

        <footer className="px-6 py-5 flex justify-center gap-6 text-[0.72rem] text-[#2a3548] border-t border-[rgba(0,184,245,0.06)]">
          <Link href="/crm/legal/privacy" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Privacy policy</Link>
          <Link href="/crm/legal/terms" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Terms &amp; conditions</Link>
        </footer>
      </div>
    </div>
  )
}
