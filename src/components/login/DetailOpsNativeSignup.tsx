'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { Figtree, Fraunces } from 'next/font/google'
import {
  injectNativeAuthKeyframes,
  nativeAuthStreaks,
  nativeAuthStyles as styles,
} from '@/components/login/native-auth-styles'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic', 'normal'],
})

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

export type DetailOpsNativeSignupProps = {
  logoSrc?: string
  name: string
  onNameChange: (v: string) => void
  businessName: string
  onBusinessNameChange: (v: string) => void
  phone: string
  onPhoneChange: (v: string) => void
  email: string
  onEmailChange: (v: string) => void
  password: string
  onPasswordChange: (v: string) => void
  smsConsent: boolean
  onSmsConsentChange: (v: boolean) => void
  error: string | null
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function DetailOpsNativeSignup({
  logoSrc = '/detailopslogo.png',
  name,
  onNameChange,
  businessName,
  onBusinessNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  smsConsent,
  onSmsConsentChange,
  error,
  loading,
  onSubmit,
}: DetailOpsNativeSignupProps) {
  const gradientId = useId().replace(/:/g, '')
  const [showPassword, setShowPassword] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [nameFocused, setNameFocused] = useState(false)
  const [bizFocused, setBizFocused] = useState(false)
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

  useEffect(() => {
    injectNativeAuthKeyframes()
    setMounted(true)
  }, [])

  function noIconInputStyle(focused: boolean): React.CSSProperties {
    return {
      ...styles.fieldInputNoIcon,
      ...(focused ? styles.fieldInputFocus : {}),
    }
  }

  function inputStyle(focused: boolean): React.CSSProperties {
    return {
      ...styles.fieldInput,
      ...(focused ? styles.fieldInputFocus : {}),
    }
  }

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

      {nativeAuthStreaks.map((s, i) => (
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
                Create
              </span>
              <span className={fraunces.className} style={styles.headlineAccent}>
                account.
              </span>
            </h1>
          </div>
          <p style={styles.subtext}>
            We&apos;ll set up your business profile and booking page — enter your details to get started.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            opacity: mounted ? 1 : 0,
            animation: mounted ? 'doRiseIn 0.75s cubic-bezier(0.16,1,0.3,1) forwards 0.28s' : 'none',
          }}
        >
          {error ? <div style={styles.authError}>{error}</div> : null}

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel} htmlFor="native-signup-name">
              Full name
            </label>
            <input
              id="native-signup-name"
              className="do-native-auth-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              style={noIconInputStyle(nameFocused)}
              autoComplete="name"
              required
            />
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel} htmlFor="native-signup-business">
              Business
            </label>
            <input
              id="native-signup-business"
              className="do-native-auth-input"
              type="text"
              placeholder="Business or company name"
              value={businessName}
              onChange={e => onBusinessNameChange(e.target.value)}
              onFocus={() => setBizFocused(true)}
              onBlur={() => setBizFocused(false)}
              style={noIconInputStyle(bizFocused)}
              autoComplete="organization"
              required
            />
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel} htmlFor="native-signup-phone">
              Phone <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
            </label>
            <input
              id="native-signup-phone"
              className="do-native-auth-input"
              type="tel"
              placeholder="(555) 000-0000"
              value={phone}
              onChange={e => onPhoneChange(e.target.value)}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              style={noIconInputStyle(phoneFocused)}
              autoComplete="tel"
            />
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel} htmlFor="native-signup-email">
              Email
            </label>
            <div style={styles.fieldInner}>
              <input
                id="native-signup-email"
                className="do-native-auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => onEmailChange(e.target.value)}
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
            <label style={styles.fieldLabel} htmlFor="native-signup-password">
              Password
            </label>
            <div style={styles.fieldInner}>
              <input
                id="native-signup-password"
                className="do-native-auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => onPasswordChange(e.target.value)}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                style={inputStyle(passFocused)}
                autoComplete="new-password"
                required
                minLength={6}
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

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              cursor: 'pointer',
              marginBottom: 16,
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={e => onSmsConsentChange(e.target.checked)}
              style={{
                marginTop: 3,
                width: 18,
                height: 18,
                accentColor: '#00b8f5',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.82rem', color: '#5a6a80', lineHeight: 1.45 }}>
              I agree to receive SMS from DetailOps about my account and bookings.
            </span>
          </label>

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
            {loading ? 'Creating account…' : 'Continue'}
            {!loading ? <span style={styles.btnArrow}>→</span> : null}
          </button>

          <p style={styles.signupRow}>
            <span style={styles.signupText}>Already have an account? </span>
            <Link href="/login" style={styles.signupLink}>
              Sign in
            </Link>
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
