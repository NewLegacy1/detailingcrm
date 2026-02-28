'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { SidebarNew } from '@/components/sidebar-new'
import { MobileLayout } from '@/components/mobile/MobileLayout'
import { ProductTour } from '@/components/ProductTour'
import { useIsMobile } from '@/hooks/use-media-query'
import { subtextColorFromBg, secondaryTextColorFromBg } from '@/lib/utils'
import type { UserRole } from '@/types/database'

function hexToRgba(hex: string, alpha: number): string {
  const trimmed = hex.replace(/^#/, '')
  if (trimmed.length !== 6 && trimmed.length !== 3) return `rgba(0, 184, 245, ${alpha})`
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
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(0, 184, 245, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Relative luminance (0–1). Backgrounds with value > 0.5 are treated as light. */
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

interface MainLayoutClientProps {
  role: UserRole
  userEmail?: string | null
  displayName?: string | null
  businessName?: string | null
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
  /** When true, show one-time product tour for org owner (first time only). */
  showProductTour?: boolean
  subscriptionPlan?: 'starter' | 'pro' | null
  children: React.ReactNode
}

export function MainLayoutClient({
  role,
  displayName,
  logoUrl,
  jobCount = 0,
  invoiceCount = 0,
  crmColors,
  showProductTour = false,
  subscriptionPlan = null,
  children,
}: MainLayoutClientProps) {
  const searchParams = useSearchParams()
  const forceShowTour = searchParams.get('showTour') === '1'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tourDismissed, setTourDismissed] = useState(false)
  const [tourInProgressFromStorage, setTourInProgressFromStorage] = useState(false)
  const isMobile = useIsMobile()

  // Once the tour is shown (owner first time or ?showTour=1), persist "in progress" so it survives layout remounts on navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    setTourInProgressFromStorage(sessionStorage.getItem('crm_tour_in_progress') === '1')
  }, [])

  const shouldShowTour =
    (showProductTour || forceShowTour || tourInProgressFromStorage) && !tourDismissed

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
      // Override text-2 and text-3 with palette-derived colours so subtext is always visible on custom bg
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

  if (isMobile) {
    return (
      <>
        {shouldShowTour && (
          <ProductTour
            onComplete={() => {
              if (typeof window !== 'undefined') sessionStorage.removeItem('crm_tour_in_progress')
              setTourDismissed(true)
            }}
            skipPersist={forceShowTour}
          />
        )}
        <MobileLayout
          role={role}
          displayName={displayName}
          logoUrl={logoUrl}
          jobCount={jobCount}
          invoiceCount={invoiceCount}
          crmColors={crmColors}
          subscriptionPlan={subscriptionPlan}
        >
          {children}
        </MobileLayout>
      </>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', ...style }}>
      {shouldShowTour && (
        <ProductTour
          onComplete={() => {
            if (typeof window !== 'undefined') sessionStorage.removeItem('crm_tour_in_progress')
            setTourDismissed(true)
          }}
          skipPersist={forceShowTour}
        />
      )}
      <SidebarNew
        role={role}
        fullName={displayName}
        userRole={role}
        avatarUrl={logoUrl}
        jobCount={jobCount}
        invoiceCount={invoiceCount}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        subscriptionPlan={subscriptionPlan}
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
        className="page-content-wrap lg:ml-[224px]"
      >
        <main style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
