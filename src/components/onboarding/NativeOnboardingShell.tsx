'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { Figtree, Fraunces } from 'next/font/google'
import {
  injectNativeAuthKeyframes,
  nativeAuthStreaks,
  nativeAuthStyles as styles,
} from '@/components/login/native-auth-styles'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic', 'normal'],
})

export function OnboardingStepHeadline({
  line1,
  line2Accent,
}: {
  line1: string
  line2Accent?: string
}) {
  return (
    <h1 className={figtree.className} style={{ margin: 0 }}>
      <span style={styles.onboardingTitleFig}>{line1}</span>
      {line2Accent ? (
        <span className={fraunces.className} style={styles.onboardingTitleAccent}>
          {line2Accent}
        </span>
      ) : null}
    </h1>
  )
}

export type NativeOnboardingShellProps = {
  children: ReactNode
  /** When true (default), show progress bar + stepLabel */
  showProgress?: boolean
  progressPercent?: number
  stepLabel?: string
  logoHref?: string
  logoSrc?: string
  contentMaxWidth?: number
  /** Sticky foot content (e.g. sign-in line + legal links) */
  footer?: ReactNode
}

export function NativeOnboardingShell({
  children,
  showProgress = true,
  progressPercent = 0,
  stepLabel,
  logoHref = '/',
  logoSrc = '/detailopslogo.png',
  contentMaxWidth = 440,
  footer,
}: NativeOnboardingShellProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    injectNativeAuthKeyframes()
    setMounted(true)
  }, [])

  const contentStyle: CSSProperties = {
    ...styles.onboardingContent,
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
        <header style={styles.onboardingTopBar}>
          <div style={styles.onboardingTopBarInner}>
            <Link href={logoHref} style={{ opacity: 0.95, lineHeight: 0, flexShrink: 0 }}>
              <img src={logoSrc} alt="DetailOps" style={styles.onboardingLogoCompact} />
            </Link>
            {showProgress && stepLabel ? (
              <>
                <div style={styles.onboardingProgressTrack}>
                  <div
                    style={{
                      ...styles.onboardingProgressFill,
                      width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                    }}
                  />
                </div>
                <span style={styles.onboardingStepBadge}>{stepLabel}</span>
              </>
            ) : null}
          </div>
        </header>

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
