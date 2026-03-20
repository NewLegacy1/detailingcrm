'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { CRM_BASE } from '@/lib/crm-path'
import { useCapacitorNative } from '@/hooks/use-capacitor-native'
import { CAPACITOR_TOP_SAFE_PADDING } from '@/lib/capacitor-safe-area'

/**
 * iOS-safe top inset + optional sub-page back control.
 * Avoids a full header (logo/title/profile) so system status content stays readable.
 */
export function MobileSafeAreaChrome() {
  const pathname = usePathname()
  const router = useRouter()
  const native = useCapacitorNative()
  const relativePath = pathname.startsWith(CRM_BASE) ? pathname.slice(CRM_BASE.length) : pathname
  const relativeSegments = relativePath.split('/').filter(Boolean)
  const showBack = relativeSegments.length > 1

  return (
    <div
      className={`shrink-0 z-30 w-full ${native ? '' : 'md:hidden'}`}
      style={{
        paddingTop: CAPACITOR_TOP_SAFE_PADDING,
        background: 'var(--bg)',
      }}
    >
      {showBack ? (
        <div
          className="flex items-center border-b px-1"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center rounded-xl min-w-[52px] min-h-[52px] active:opacity-80"
            style={{ color: 'var(--text-1)' }}
            aria-label="Back"
          >
            <ChevronLeft size={30} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}
