'use client'

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
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

/** Same logo, headline scale (Figtree + Fraunces), and subtext as `DetailOpsNativeLogin`. */
export function OnboardingLoginHero({
  line1,
  line2Accent,
  subtext,
  logoSrc = '/detailopslogo.png',
  showLogo = true,
}: {
  line1: string
  line2Accent?: string
  subtext?: ReactNode
  logoSrc?: string
  showLogo?: boolean
}) {
  const gradientId = useId().replace(/:/g, '')
  const [logoError, setLogoError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      style={{
        ...styles.heroIntro,
        opacity: mounted ? 1 : 0,
        animation: mounted ? 'doRiseIn 0.75s cubic-bezier(0.16,1,0.3,1) forwards 0.08s' : 'none',
      }}
    >
      <div style={styles.heroStack}>
        {showLogo ? (
          <div style={styles.logoWrap}>
            {!logoError ? (
              <img
                src={logoSrc}
                alt="DetailOps"
                style={styles.logoImg}
                onError={() => setLogoError(true)}
              />
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
        ) : null}
        <h1 style={styles.heroH1}>
          <span className={figtree.className} style={styles.headlineTop}>
            {line1}
          </span>
          {line2Accent ? (
            <span className={fraunces.className} style={styles.headlineAccent}>
              {line2Accent}
            </span>
          ) : null}
        </h1>
      </div>
      {subtext != null && subtext !== '' ? (
        typeof subtext === 'string' ? (
          <p style={styles.subtext}>{subtext}</p>
        ) : (
          <div style={{ ...styles.subtext }}>{subtext}</div>
        )
      ) : null}
    </div>
  )
}

export type NativeOnboardingShellProps = {
  children: ReactNode
  showProgress?: boolean
  progressPercent?: number
  stepLabel?: string
  contentMaxWidth?: number
  footer?: ReactNode
}

export function NativeOnboardingShell({
  children,
  showProgress = true,
  progressPercent = 0,
  stepLabel,
  contentMaxWidth = 420,
  footer,
}: NativeOnboardingShellProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    injectNativeAuthKeyframes()
    setMounted(true)
  }, [])

  const contentStyle: CSSProperties = {
    ...styles.shell,
    maxWidth: contentMaxWidth,
    opacity: mounted ? 1 : 0,
    animation: mounted ? 'doRiseIn 0.65s cubic-bezier(0.16,1,0.3,1) forwards 0.06s' : 'none',
  }

  return (
    <div
      className={figtree.className}
      style={{
        ...styles.scene,
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
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

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {showProgress && stepLabel ? (
          <header style={styles.onboardingTopBar}>
            <div style={{ ...styles.onboardingTopBarInner, maxWidth: contentMaxWidth }}>
              <div style={styles.onboardingProgressTrack}>
                <div
                  style={{
                    ...styles.onboardingProgressFill,
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  }}
                />
              </div>
              <span style={styles.onboardingStepBadge}>{stepLabel}</span>
            </div>
          </header>
        ) : null}

        <div style={styles.onboardingScroll}>
          <div style={contentStyle}>{children}</div>
          {footer ? <div style={{ marginTop: 'auto' }}>{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function OnboardingPrimaryButton({
  children,
  disabled,
  type = 'button',
  onClick,
  style,
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles.btnCta,
        flex: 1,
        ...(disabled ? { opacity: 0.72, cursor: 'not-allowed' } : {}),
        ...style,
      }}
    >
      <div className="do-btn-shimmer" />
      <div className="do-btn-overlay" />
      {children}
    </button>
  )
}

export function OnboardingSecondaryButton({
  children,
  disabled,
  type = 'button',
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles.onboardingBtnSecondary,
        ...(disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
      }}
    >
      {children}
    </button>
  )
}

export { fraunces, figtree }
