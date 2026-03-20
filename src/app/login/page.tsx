'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { AuthHeroPanel } from '@/components/AuthHeroPanel'
import { AnimatedLoginBg } from '@/components/login/AnimatedLoginBg'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
})

const inputClass =
  'w-full py-3.5 px-5 rounded-full border border-[rgba(255,255,255,0.07)] bg-[#0c1018] text-[0.88rem] text-[#eef0f2] placeholder:text-[#64748b] outline-none transition-[border-color,box-shadow,background] focus:border-[rgba(0,184,245,0.4)] focus:bg-[#0d1319] focus:shadow-[0_0_0_3px_rgba(0,184,245,0.08)]'
const submitBtnClass =
  'w-full py-[15px] rounded-full border-0 text-white text-[0.95rem] font-medium tracking-wide cursor-pointer transition-[opacity,transform,box-shadow] hover:opacity-90 hover:shadow-[0_6px_28px_rgba(0,184,245,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/crm/dashboard'

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(redirectTo)
        router.refresh()
      }
    }
    checkSession()
  }, [router, redirectTo])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        return
      }
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Mobile / Capacitor-first login (hidden on md+) */}
      <div className="login-mobile-bg md:hidden">
        <AnimatedLoginBg />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 480,
            height: 420,
            background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(0,184,245,0.10) 0%, transparent 75%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div className="login-mobile-content">
          <div
            style={{
              flex: '0 0 auto',
              padding: '56px 32px 0',
              maxWidth: 480,
              width: '100%',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(0,184,245,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                boxShadow: '0 0 24px rgba(0,184,245,0.12)',
              }}
            >
              <Image
                src="/detailopslogo.png"
                alt="DetailOps"
                width={48}
                height={48}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#00b8f5',
                marginBottom: 12,
              }}
            >
              DetailOps
            </p>
            <div style={{ marginBottom: 14 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 'clamp(38px, 10vw, 52px)',
                  fontWeight: 700,
                  color: '#eef2ff',
                  lineHeight: 1.05,
                  letterSpacing: '-1.5px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Welcome
              </span>
              <span
                className="login-fraunces"
                style={{
                  display: 'block',
                  fontSize: 'clamp(44px, 11.5vw, 60px)',
                  color: '#00b8f5',
                  lineHeight: 1.0,
                  letterSpacing: '-1px',
                }}
              >
                Back.
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                color: '#4a5a72',
                lineHeight: 1.55,
                marginBottom: 0,
              }}
            >
              The CRM built for detailers.<br />
              Sign in to your workspace.
            </p>
          </div>
          <div style={{ flex: 1, minHeight: 32 }} />
          <div
            style={{
              flex: '0 0 auto',
              padding: '0 24px 40px',
              maxWidth: 480,
              width: '100%',
              margin: '0 auto',
            }}
          >
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div
                  style={{
                    borderRadius: 12,
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    padding: '10px 16px',
                    fontSize: 13,
                    color: '#fca5a5',
                  }}
                >
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="login-email-mobile"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#3d4d65',
                    marginBottom: 8,
                  }}
                >
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-email-mobile"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '14px 44px 14px 18px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(12,16,24,0.85)',
                      color: '#eef2ff',
                      fontSize: 15,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(0,184,245,0.45)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,184,245,0.08)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.07)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#3d4d65',
                      fontSize: 16,
                      pointerEvents: 'none',
                    }}
                  >
                    ✉
                  </span>
                </div>
              </div>
              <div>
                <label
                  htmlFor="login-password-mobile"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#3d4d65',
                    marginBottom: 8,
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password-mobile"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '14px 44px 14px 18px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(12,16,24,0.85)',
                      color: '#eef2ff',
                      fontSize: 15,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(0,184,245,0.45)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,184,245,0.08)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.07)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#3d4d65',
                      cursor: 'pointer',
                      padding: 4,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🔓' : '🔒'}
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: 8 }}>
                  <Link
                    href="/login/forgot-password"
                    style={{ fontSize: 13, color: '#00b8f5', textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 14,
                  border: 'none',
                  background: loading
                    ? 'rgba(255,255,255,0.06)'
                    : 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
                  color: loading ? '#4a5a72' : '#eef2ff',
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: loading ? 'none' : '0 0 0 1px rgba(0,184,245,0.15), 0 4px 24px rgba(0,0,0,0.4)',
                  transition: 'opacity 0.2s, box-shadow 0.2s',
                  marginTop: 4,
                }}
              >
                {loading ? 'Signing in…' : (
                  <>
                    Sign In
                    <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
                  </>
                )}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#3a4a60' }}>
              New to DetailOps?{' '}
              <Link href="/signup" style={{ color: '#00b8f5', fontWeight: 600, textDecoration: 'none' }}>
                Get started free
              </Link>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
              <Link href="/privacy" style={{ fontSize: 12, color: '#2a3548', textDecoration: 'none' }}>
                Privacy
              </Link>
              <Link href="/terms" style={{ fontSize: 12, color: '#2a3548', textDecoration: 'none' }}>
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop login (hidden below md) */}
      <div className={`auth-hero-bg min-h-screen hidden md:flex items-center justify-center px-4 py-8 ${plusJakarta.className}`}>
        <div className="relative w-full flex items-center justify-center">
          <div className="auth-hero-glow" aria-hidden />
          <div className="auth-card w-[1100px] max-w-[98vw] min-h-[520px] h-[620px] max-h-[90vh] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[45%_55%] shadow-2xl border border-[rgba(255,255,255,0.07)] relative bg-[#101620]">
            <div className="hidden md:block relative bg-[#0c1018] overflow-hidden min-h-[280px]">
              <AuthHeroPanel />
            </div>
            <div className="flex flex-col flex-1 min-h-0 bg-[#101620] md:border-l border-[rgba(255,255,255,0.07)]">
              <div className="flex-1 min-h-0 overflow-y-auto auth-panel-scroll flex flex-col justify-center items-center py-10 md:py-12 px-6 sm:px-12 md:px-16">
                <div className="flex justify-center mb-4 md:mb-5 md:hidden">
                  <Image src="/detailopslogo.png" alt="DetailOps" width={160} height={160} className="h-40 w-40 min-h-[160px] min-w-[160px] object-contain" />
                </div>
                <h1 className="text-[1.6rem] font-bold text-[#dce6f5] mb-1.5 tracking-tight text-center">
                  Welcome Back
                </h1>
                <p className="text-[0.82rem] text-[#4a5568] mb-8">
                  Sign in to your DetailOps account
                </p>
                <form onSubmit={handleSignIn} className="w-full max-w-[360px] flex flex-col gap-3">
                  {error && (
                    <div className="rounded-full bg-red-500/20 px-4 py-2.5 text-sm text-red-200">{error}</div>
                  )}
                  <input
                    id="login-email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="eg. you@detailops.com"
                    autoComplete="email"
                    className={inputClass}
                  />
                  <input
                    id="login-password-desktop"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="password"
                    autoComplete="current-password"
                    className={inputClass}
                  />
                  <p className="text-right -mt-1">
                    <Link href="/login/forgot-password" className="text-[0.8rem] text-[#00b8f5] hover:underline">Forgot password?</Link>
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className={submitBtnClass}
                    style={{
                      background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                      boxShadow: '0 4px 20px rgba(0,184,245,0.35)',
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign In →'}
                  </button>
                  <p className="mt-1 text-[0.82rem] text-[#3a4a60] text-center">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-[#00b8f5] underline font-medium">
                      Sign up
                    </Link>
                  </p>
                </form>
              </div>
              <div className="shrink-0 flex justify-center gap-5 py-4 px-6 text-[0.72rem] text-[#2a3548]">
                <Link href="/privacy" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Privacy policy</Link>
                <Link href="/terms" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Terms &amp; conditions</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-hero-bg min-h-screen flex flex-col md:flex-row">
          <div className="login-mobile-bg md:hidden flex flex-1 items-center justify-center">
            <div style={{ color: '#3d4d65', fontSize: 14 }}>Loading…</div>
          </div>
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-[#64748b]">Loading...</div>
          </div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  )
}
