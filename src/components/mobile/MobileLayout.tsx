'use client'

import { useMemo } from 'react'
import { MobileHeader } from './MobileHeader'
import { BottomTabBar } from './BottomTabBar'
import { subtextColorFromBg, secondaryTextColorFromBg } from '@/lib/utils'
import type { UserRole } from '@/types/database'

function hexToRgba(hex: string, alpha: number): string {
  const trimmed = hex.replace(/^#/, '')
  if (trimmed.length !== 6 && trimmed.length !== 3) return `rgba(59, 130, 246, ${alpha})`
  let r: number, g: number, b: number
  if (trimmed.length === 6) {
    r = parseInt(trimmed.slice(0, 2), 16)
    g = parseInt(trimmed.slice(2, 4), 16)
    b = parseInt(trimmed.slice(4, 6), 16)
  } else {
    r = parseInt(trimmed[0] + trimmed[0], 16)
    g = parseInt(trimmed[1] + trimmed[1], 16)
    b = parseInt(trimmed[2] + trimmed[2], 16)
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(59, 130, 246, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function isLightBackground(hex: string): boolean {
  const trimmed = hex.replace(/^#/, '')
  if (trimmed.length !== 6 && trimmed.length !== 3) return false
  let r: number, g: number, b: number
  if (trimmed.length === 6) {
    r = parseInt(trimmed.slice(0, 2), 16) / 255
    g = parseInt(trimmed.slice(2, 4), 16) / 255
    b = parseInt(trimmed.slice(4, 6), 16) / 255
  } else {
    r = parseInt(trimmed[0] + trimmed[0], 16) / 255
    g = parseInt(trimmed[1] + trimmed[1], 16) / 255
    b = parseInt(trimmed[2] + trimmed[2], 16) / 255
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 0.5
}

const LIGHT_THEME_TEXT = {
  '--text-1': '#0f172a',
  '--text-2': '#475569',
  '--text-3': '#64748b',
  '--text': '#0f172a',
  '--text-secondary': '#475569',
  '--text-muted': '#64748b',
  '--border': 'rgba(0, 0, 0, 0.08)',
  '--border-hi': 'rgba(0, 0, 0, 0.14)',
  '--surface-2': '#f1f5f9',
  '--surface-3': '#e2e8f0',
} as const

const DARK_THEME_TEXT = {
  '--text-1': '#eef2ff',
  '--text-2': '#7e8da8',
  '--text-3': '#3d4d65',
  '--text': '#eef2ff',
  '--text-secondary': '#7e8da8',
  '--text-muted': '#3d4d65',
  '--border': 'rgba(255, 255, 255, 0.055)',
  '--border-hi': 'rgba(255, 255, 255, 0.1)',
  '--surface-2': '#111620',
  '--surface-3': '#181e2c',
} as const

interface MobileLayoutProps {
  role: UserRole
  displayName?: string | null
  logoUrl?: string | null
  jobCount?: number
  invoiceCount?: number
  crmColors?: {
    accent: string
    bg: string
    surface: string
    surface1?: string
    surface2?: string
    surface3?: string
    surface4?: string
  } | null
  subscriptionPlan?: 'starter' | 'pro' | null
  children: React.ReactNode
}

export function MobileLayout({
  role,
  displayName,
  logoUrl,
  jobCount = 0,
  invoiceCount = 0,
  crmColors,
  subscriptionPlan,
  children,
}: MobileLayoutProps) {
  const style = useMemo(() => {
    if (!crmColors) return undefined
    const s: Record<string, string> = {}
    if (crmColors.accent?.trim()) {
      s['--accent'] = crmColors.accent.trim()
      s['--accent-dim'] = hexToRgba(crmColors.accent.trim(), 0.12)
    }
    const bg = crmColors.bg?.trim()
    if (bg) {
      s['--bg'] = bg
      const textBorder = isLightBackground(bg) ? LIGHT_THEME_TEXT : DARK_THEME_TEXT
      Object.assign(s, textBorder)
      s['--text-2'] = secondaryTextColorFromBg(bg)
      s['--text-3'] = subtextColorFromBg(bg)
      s['--text-secondary'] = s['--text-2']
      s['--text-muted'] = s['--text-3']
      s['--surface-1'] = (crmColors.surface1 ?? crmColors.surface)?.trim() || bg
      if (crmColors.surface2?.trim()) {
        s['--surface-2'] = crmColors.surface2.trim()
        s['--bg-card'] = crmColors.surface2.trim()
      }
      if (crmColors.surface3?.trim()) s['--surface-3'] = crmColors.surface3.trim()
      if (crmColors.surface4?.trim()) s['--surface-4'] = crmColors.surface4.trim()
    }
    return Object.keys(s).length ? (s as React.CSSProperties) : undefined
  }, [crmColors])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        ...style,
      }}
    >
      <MobileHeader displayName={displayName} logoUrl={logoUrl} />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </main>
      <BottomTabBar role={role} jobCount={jobCount} invoiceCount={invoiceCount} subscriptionPlan={subscriptionPlan} />
    </div>
  )
}
