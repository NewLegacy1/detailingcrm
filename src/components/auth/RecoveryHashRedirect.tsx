'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * When Supabase sends a password reset link, it may redirect to the Site URL (e.g. /)
 * with the token in the hash: /#access_token=...&type=recovery
 * Redirect to /auth/callback so the callback page can process the session and send
 * the user to update-password.
 */
export function RecoveryHashRedirect() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/' || typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash) return
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const type = params.get('type')
    const accessToken = params.get('access_token')
    if ((type === 'recovery' || accessToken) && hash) {
      window.location.replace(`/auth/callback${hash}`)
    }
  }, [pathname])

  return null
}
