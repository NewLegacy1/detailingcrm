import type { CSSProperties } from 'react'
import { CAPACITOR_TOP_SAFE_PADDING } from '@/lib/capacitor-safe-area'

const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)'

export const nativeAuthStyles: Record<string, CSSProperties> = {
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
    /* ≥16px prevents iOS Safari/WKWebView auto-zoom on focus */
    fontSize: '16px',
    fontWeight: 400,
    color: '#eef0f2',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    WebkitAppearance: 'none',
  },
  fieldInputNoIcon: {
    width: '100%',
    height: 52,
    background: 'rgba(12,16,24,0.65)',
    border: '1px solid rgba(0,184,245,0.12)',
    borderRadius: 9999,
    padding: '0 18px',
    fontFamily: 'inherit',
    fontSize: '16px',
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
  /** Full-bleed onboarding (same scene as login; content sits on background — no card panel) */
  onboardingTopBar: {
    position: 'relative' as const,
    zIndex: 12,
    flexShrink: 0,
    borderBottom: '1px solid rgba(0,184,245,0.1)',
    background: 'rgba(8,12,20,0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '14px 0',
  },
  onboardingTopBarInner: {
    maxWidth: 520,
    marginLeft: 0,
    marginRight: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  onboardingLogoCompact: {
    height: 36,
    width: 'auto',
    objectFit: 'contain' as const,
    objectPosition: 'left center',
    flexShrink: 0,
  },
  onboardingProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 9999,
    background: 'rgba(12,20,32,0.9)',
    overflow: 'hidden',
    minWidth: 0,
  },
  onboardingProgressFill: {
    height: '100%',
    borderRadius: 9999,
    background: 'linear-gradient(90deg, #00b8f5, #33d6ff)',
    transition: 'width 0.35s cubic-bezier(0.16,1,0.3,1)',
  },
  onboardingStepBadge: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: 'rgba(90,106,128,0.95)',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  onboardingScroll: {
    position: 'relative' as const,
    zIndex: 10,
    flex: '1 1 auto',
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
    padding: 'clamp(1.25rem, 4vw, 1.75rem) max(1.25rem, env(safe-area-inset-left, 0px)) max(2rem, env(safe-area-inset-bottom, 0px)) max(1.25rem, env(safe-area-inset-right, 0px))',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'stretch',
  },
  onboardingContent: {
    width: '100%',
    maxWidth: 440,
    marginLeft: 0,
    marginRight: 'auto',
    flex: '1 0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
    boxSizing: 'border-box' as const,
  },
  onboardingTitleFig: {
    fontSize: 'clamp(1.75rem, 5.5vw, 2.35rem)',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    color: '#eef0f2',
    lineHeight: 1.12,
    margin: 0,
  },
  onboardingTitleAccent: {
    fontSize: 'clamp(2rem, 6.5vw, 2.75rem)',
    fontWeight: 400,
    fontStyle: 'italic',
    letterSpacing: '-0.03em',
    color: '#00b8f5',
    lineHeight: 1.05,
    display: 'block',
    marginTop: '-0.08em',
  },
  onboardingLead: {
    fontSize: '1rem',
    fontWeight: 400,
    color: '#5a6a80',
    lineHeight: 1.55,
    margin: 0,
    marginTop: 12,
    marginBottom: 24,
    maxWidth: 400,
  },
  onboardingBtnRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
  },
  onboardingBtnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    border: '1px solid rgba(0,184,245,0.28)',
    background: 'rgba(12,16,24,0.45)',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#c8d5e8',
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s, opacity 0.2s',
  },
  onboardingGlassRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 9999,
    border: '1px solid rgba(0,184,245,0.12)',
    background: 'rgba(12,16,24,0.45)',
  },
  onboardingFooterNote: {
    textAlign: 'center' as const,
    fontSize: '0.82rem',
    color: 'rgba(90,106,128,0.85)',
    marginTop: 28,
    marginBottom: 8,
    lineHeight: 1.45,
  },
}

export const NATIVE_AUTH_KEYFRAMES_ID = 'do-native-auth-keyframes'

export function injectNativeAuthKeyframes(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(NATIVE_AUTH_KEYFRAMES_ID)) return
  const style = document.createElement('style')
  style.id = NATIVE_AUTH_KEYFRAMES_ID
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
    .do-native-auth-input::placeholder { color: rgba(100,116,139,0.55); }
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

export const nativeAuthStreaks = [
  { left: '8%', height: 60, duration: '4s', delay: '0s' },
  { left: '28%', height: 90, duration: '5.5s', delay: '1.8s' },
  { left: '55%', height: 50, duration: '3.8s', delay: '0.9s' },
  { left: '74%', height: 70, duration: '6s', delay: '3s' },
  { left: '90%', height: 45, duration: '4.5s', delay: '2.2s' },
] as const
