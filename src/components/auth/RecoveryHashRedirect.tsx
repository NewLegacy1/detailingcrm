'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Fallback when inline script didn't run: if we're on / or /login with recovery params
 * in hash or query, redirect to /auth/callback.
 */
export function RecoveryHashRedirect() {
  const pathname = usePathname()

  useEffect(() => {
    if ((pathname !== '/' && pathname !== '/login') || typeof window === 'undefined') return
    const hash = window.location.hash || ''
    const query = window.location.search || ''
    const hasHash = hash && (hash.indexOf('type=recovery') !== -1 || hash.indexOf('access_token') !== -1 || hash.indexOf('code=') !== -1)
    const hasQuery = query && (query.indexOf('token_hash') !== -1 || query.indexOf('code=') !== -1)
    if (hasHash || hasQuery) {
      window.location.replace(`/auth/callback${query}${hash}`)
    }
  }, [pathname])

  return null
}
