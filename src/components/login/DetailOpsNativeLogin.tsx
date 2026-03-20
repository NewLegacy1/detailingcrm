'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { Figtree, Fraunces } from 'next/font/google'
import { CAPACITOR_TOP_SAFE_PADDING } from '@/lib/capacitor-safe-area'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic', 'normal'],
})

const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)'

const styles: Record<string, React.CSSProperties> = {
  scene: {
    width: '100%',
    background: '#080c14',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    position: 'relative',
    overflowX: 'hidden',
    overflowY: 'auto',
    boxSizing: 'border-box',
    paddingTop: `calc(${CAPACITOR_TOP_SAFE_PADDING} + 8px)`,
    paddingBottom: `max(1.5rem, ${SAFE_BOTTOM})`,
    paddingLeft: 'max(1.25rem, env(safe-area-inset-left, 0px))',
    paddingRight: 'max(1.25rem, env(safe-area-inset-right, 0px))',
    WebkitTapHighlightColor: 'transparent',
    WebkitOverflowScrolling: 'touch',
  },
  blobBase: {
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  blob1: {
    width: 500,
    height: 500,
    background: 'radial-gradient(circle, rgba(0,184,245,0.1) 0%, transparent 70%)',
    top: -180,
    left: -120,
  },
  blob2: {
    width: 380,
    height: 380,
    background: 'radial-gradient(circle, rgba(0,80,160,0.08) 0%, transparent 70%)',
    bottom: -100,
    right: -80,
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(0,184,245,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,184,245,0.035) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
    WebkitMaskImage:
      'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
    pointerEvents: 'none',
  },
  shell: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 420,
    margin: 0,
    marginRight: 'auto',
    flex: '1 0 auto',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  heroIntro: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    gap: 'clamp(1.25rem, 4.2vw, 1.5rem)',
  },
  heroStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
    textAlign: 'left',
    gap: 'clamp(1.25rem, 4.2vw, 1.5rem)',
  },
  logoWrap: {
    position: 'relative',
    width: 'clamp(88px, 24vw, 112px)',
    height: 'clamp(88px, 24vw, 112px)',
    marginLeft: '-10px',
    alignSelf: 'flex-start',
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'left center',
    borderRadius: 'clamp(18px, 5vw, 22px)',
    display: 'block',
    filter: 'drop-shadow(0 0 16px rgba(0,184,245,0.28))',
  },
  headlineTop: {
    fontSize: 'clamp(44px, 11vw, 64px)',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    wordSpacing: 'normal',
    color: '#eef0f2',
    lineHeight: 1.08,
    display: 'block',
    marginBottom: '-0.12em',
  },
  headlineAccent: {
    fontSize: 'clamp(52px, 14vw, 78px)',
    fontWeight: 400,
    fontStyle: 'italic',
    letterSpacing: '-0.03em',
    wordSpacing: 'normal',
    color: '#00b8f5',
    lineHeight: 1,
    display: 'block',
    marginTop: '-0.02em',
  },
  heroH1: {
    margin: 0,
    width: '100%',
    textAlign: 'left',
  },
  subtext: {
    fontSize: '1rem',
    fontWeight: 400,
    color: '#5a6a80',
    lineHeight: 1.6,
    margin: 0,
    marginBottom: 28,
    maxWidth: 360,
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(90,106,128,0.85)',
    marginBottom: 8,
  },
  fieldInner: {
    position: 'relative',
  },
  fieldInput: {
    width: '100%',
    height: 52,
    background: 'rgba(12,16,24,0.65)',
    border: '1px solid rgba(0,184,245,0.12)',
    borderRadius: 9999,
    padding: '0 46px 0 18px',
    fontFamily: 'inherit',
    fontSize: '0.88rem',
    fontWeight: 400,
    color: '#eef0f2',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    WebkitAppearance: 'none',
  },
  fieldInputFocus: {
    borderColor: 'rgba(0,184,245,0.4)',
    background: 'rgba(13,19,25,0.85)',
    boxShadow: '0 0 0 3px rgba(0,184,245,0.08)',
  },
  fieldIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 18,
    height: 18,
    color: 'rgba(90,106,128,0.5)',
    pointerEvents: 'none',
  },
  forgotRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    margin: '8px 0 20px',
  },
  forgotLink: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#00b8f5',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  btnCta: {
    width: '100%',
    height: 52,
    border: 'none',
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
    boxShadow: '0 4px 20px rgba(0,184,245,0.35)',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: '#fff',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform 0.12s, opacity 0.12s, filter 0.12s',
  },
  btnArrow: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    lineHeight: 1,
  },
  signupRow: {
    textAlign: 'center',
    fontSize: '0.82rem',
    marginTop: 22,
  },
  signupText: {
    color: 'rgba(90,106,128,0.9)',
  },
  signupLink: {
    color: '#00b8f5',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  legalRow: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 28,
    paddingBottom: 4,
  },
  legalLink: {
    fontSize: 10,
    color: 'rgba(90,106,128,0.65)',
    textDecoration: 'none',
    letterSpacing: '0.04em',
  },
  authError: {
    borderRadius: 9999,
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    padding: '10px 16px',
    fontSize: '0.82rem',
    color: '#fecaca',
    marginBottom: 12,
  },
}

function injectKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById('do-login-keyframes')) return
  const style = document.createElement('style')
  style.id = 'do-login-keyframes'
  style.textContent = `
    @keyframes doRiseIn {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes doShimmer {
      0%   { left: -80px; }
      100% { left: 130%; }
    }
    @keyframes doStreakFall {
      0%   { top: -100px; opacity: 0; }
      15%  { opacity: 1; }
      85%  { opacity: 1; }
      100% { top: 110%; opacity: 0; }
    }
    @keyframes doScan {
      0%   { top: 0;    opacity: 0; }
      5%   { opacity: 1; }
      95%  { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    .do-native-login-input::placeholder { color: rgba(100,116,139,0.55); }
    .do-btn-shimmer {
      position: absolute; top: 0; width: 55px; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
      transform: skewX(-18deg);
      animation: doShimmer 3s ease-in-out infinite 1.5s;
      left: -80px; pointer-events: none;
    }
    .do-btn-overlay {
      position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
      border-radius: 9999px;
    }
    .do-streak {
      position: absolute; width: 1px;
      background: linear-gradient(to bottom, transparent, rgba(0,184,245,0.35), transparent);
      animation: doStreakFall linear infinite;
    }
    .do-scan {
      position: absolute; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(0,184,245,0.12) 30%, rgba(0,220,255,0.35) 50%, rgba(0,184,245,0.12) 70%, transparent 100%);
      animation: doScan 9s linear infinite;
    }
  `
  document.head.appendChild(style)
}

function IconEmail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconEye({ show }: { show: boolean }) {
  return show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export type DetailOpsNativeLoginProps = {
  logoSrc?: string
  authError?: string | null
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>
  onSignUp: () => void
  onForgotPassword: () => void
}

export function DetailOpsNativeLogin({
  logoSrc = '/detailopslogo.png',
  authError,
  onLogin,
  onSignUp,
  onForgotPassword,
}: DetailOpsNativeLoginProps) {
  const gradientId = useId().replace(/:/g, '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    injectKeyframes()
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      await onLogin({ email, password })
    } finally {
      setLoading(false)
    }
  }

  function inputStyle(focused: boolean): React.CSSProperties {
    return {
      ...styles.fieldInput,
      ...(focused ? styles.fieldInputFocus : {}),
    }
  }

  const streaks = [
    { left: '8%', height: 60, duration: '4s', delay: '0s' },
    { left: '28%', height: 90, duration: '5.5s', delay: '1.8s' },
    { left: '55%', height: 50, duration: '3.8s', delay: '0.9s' },
    { left: '74%', height: 70, duration: '6s', delay: '3s' },
    { left: '90%', height: 45, duration: '4.5s', delay: '2.2s' },
  ] as const

  return (
    <div
      className={figtree.className}
      style={{
        ...styles.scene,
        minHeight: '100svh',
      }}
    >
      <div style={{ ...styles.blobBase, ...styles.blob1 }} />
      <div style={{ ...styles.blobBase, ...styles.blob2 }} />
      <div style={styles.grid} />

      {streaks.map((s, i) => (
        <div
          key={i}
          className="do-streak"
          style={{
            left: s.left,
            height: s.height,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}
      <div className="do-scan" />

      <div style={styles.shell}>
        <div
          style={{
            ...styles.heroIntro,
            opacity: mounted ? 1 : 0,
            animation: mounted ? 'doRiseIn 0.75s cubic-bezier(0.16,1,0.3,1) forwards 0.08s' : 'none',
          }}
        >
          <div style={styles.heroStack}>
            <div style={styles.logoWrap}>
              {!logoError ? (
                <img src={logoSrc} alt="DetailOps" style={styles.logoImg} onError={() => setLogoError(true)} />
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" style={{ display: 'block' }} aria-hidden>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#0057b8" />
                      <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M8 14L8 50L22 50C30 50 37 44 37 32C37 20 30 14 22 14Z M16 22L21 22C25 22 29 26 29 32C29 38 25 42 21 42L16 42Z"
                    fill={`url(#${gradientId})`}
                  />
                  <path d="M35 14L31 50L37 50L41 14Z" fill={`url(#${gradientId})`} />
                  <path
                    d="M41 14L41 50L52 50C59 50 64 44 64 32C64 20 59 14 52 14Z M49 22L52 22C56 22 56 26 56 32C56 38 56 42 52 42L49 42Z"
                    fill={`url(#${gradientId})`}
                  />
                </svg>
              )}
            </div>
            <h1 style={styles.heroH1}>
              <span className={figtree.className} style={styles.headlineTop}>
                Welcome
              </span>
              <span className={fraunces.className} style={styles.headlineAccent}>
                Back.
              </span>
            </h1>
          </div>
          <p style={styles.subtext}>
            Schedule jobs, manage crews, and track payments — sign in to your workspace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            opacity: mounted ? 1 : 0,
            animation: mounted ? 'doRiseIn 0.75s cubic-bezier(0.16,1,0.3,1) forwards 0.28s' : 'none',
          }}
        >
          {authError ? <div style={styles.authError}>{authError}</div> : null}
          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel} htmlFor="native-login-email">
              Email
            </label>
            <div style={styles.fieldInner}>
              <input
                id="native-login-email"
                className="do-native-login-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={inputStyle(emailFocused)}
                autoComplete="email"
                required
              />
              <span style={styles.fieldIcon}>
                <IconEmail />
              </span>
            </div>
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel} htmlFor="native-login-password">
              Password
            </label>
            <div style={styles.fieldInner}>
              <input
                id="native-login-password"
                className="do-native-login-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                style={inputStyle(passFocused)}
                autoComplete="current-password"
                required
              />
              <span
                style={{
                  ...styles.fieldIcon,
                  cursor: 'pointer',
                  pointerEvents: 'all',
                  color: 'rgba(90,106,128,0.65)',
                }}
                onClick={() => setShowPassword(v => !v)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setShowPassword(v => !v)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <IconEye show={showPassword} />
              </span>
            </div>
          </div>

          <div style={styles.forgotRow}>
            <span
              role="button"
              tabIndex={0}
              style={styles.forgotLink}
              onClick={() => onForgotPassword()}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onForgotPassword()
                }
              }}
            >
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btnCta,
              ...(loading ? { opacity: 0.72, cursor: 'not-allowed' } : {}),
            }}
          >
            <div className="do-btn-shimmer" />
            <div className="do-btn-overlay" />
            {loading ? 'Signing in…' : 'Sign In'}
            {!loading ? <span style={styles.btnArrow}>→</span> : null}
          </button>

          <p style={styles.signupRow}>
            <span style={styles.signupText}>New to DetailOps? </span>
            <span
              role="button"
              tabIndex={0}
              style={styles.signupLink}
              onClick={() => onSignUp()}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSignUp()
                }
              }}
            >
              Get started free
            </span>
          </p>
        </form>

        <div style={styles.legalRow}>
          <Link href="/privacy" style={styles.legalLink}>
            Privacy
          </Link>
          <Link href="/terms" style={styles.legalLink}>
            Terms & Conditions
          </Link>
        </div>
      </div>
    </div>
  )
}
