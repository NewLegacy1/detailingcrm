'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatedLoginBg } from '@/components/login/AnimatedLoginBg'

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
    <div className="login-mobile-bg">
      {/* Animated canvas background */}
      <AnimatedLoginBg />

      {/* Radial glow behind the heading area */}
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
        {/* Top section: logo + branding + heading */}
        <div
          style={{
            flex: '0 0 auto',
            padding: '56px 32px 0',
            maxWidth: 480,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {/* Logo circle */}
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

          {/* Brand label */}
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

          {/* Heading: "Welcome" + "Back." */}
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

          {/* Subtext */}
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

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 32 }} />

        {/* Form section */}
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

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
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
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
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

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
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
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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

            {/* Sign In button */}
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

          {/* Sign up link */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#3a4a60' }}>
            New to DetailOps?{' '}
            <Link href="/signup" style={{ color: '#00b8f5', fontWeight: 600, textDecoration: 'none' }}>
              Get started free
            </Link>
          </p>

          {/* Footer links */}
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
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-mobile-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#3d4d65', fontSize: 14 }}>Loading…</div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  )
}
