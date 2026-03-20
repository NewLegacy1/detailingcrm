'use client'

import { usePathname } from 'next/navigation'
import { useCapacitorNative } from '@/hooks/use-capacitor-native'
import { CAPACITOR_TOP_SAFE_PADDING } from '@/lib/capacitor-safe-area'

/**
 * Applies iOS safe-area padding to marketing/auth pages loaded in the Capacitor WebView.
 * Skips /crm (MobileLayout + MobileSafeAreaChrome) and /login (native full-bleed login handles insets).
 */
export function CapacitorPublicSafeArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const native = useCapacitorNative()

  if (!native) return <>{children}</>

  /* /login full-bleed native screen manages its own insets; /login/forgot-password etc. get this wrapper. */
  if (pathname.startsWith('/crm') || pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div
      className="min-h-dvh box-border w-full"
      style={{
        paddingTop: `calc(${CAPACITOR_TOP_SAFE_PADDING} + 8px)`,
        paddingBottom: `max(1rem, env(safe-area-inset-bottom, 0px))`,
        paddingLeft: `max(1rem, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(1rem, env(safe-area-inset-right, 0px))`,
      }}
    >
      {children}
    </div>
  )
}
