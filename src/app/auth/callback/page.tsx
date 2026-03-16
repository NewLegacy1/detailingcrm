'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
      <div className="text-[#5a6a80] text-sm">Loading...</div>
    </div>
  )
}

function doRedirect(path: string) {
  try {
    window.location.href = path
  } catch {
    window.location.assign(path)
  }
}

/** Read cookie set by forgot-password page so we can send user back to booking after reset. */
function getPasswordResetNextCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/password_reset_next=([^;]+)/)
  if (!match) return null
  try {
    const decoded = decodeURIComponent(match[1].trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /^https?:\/\//i.test(decoded)) return null
    return decoded
  } catch {
    return null
  }
}

/**
 * Handles redirects from Supabase Auth emails (confirm signup, magic link, reset password).
 * Supabase can send tokens either in the URL hash or as query params (token_hash, type).
 */
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'redirecting' | 'error'>('processing')
  const didRedirect = useRef(false)

  useEffect(() => {
    let mounted = true

    async function handleCallback() {
      if (didRedirect.current) return
      const cookieNext = getPasswordResetNextCookie()
      const redirectTo = searchParams.get('redirectTo') ?? searchParams.get('next') ?? cookieNext ?? '/crm/dashboard'
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      const supabase = createClient()

      // 1) Query params (token_hash + type) – e.g. from {{ .ConfirmationURL }} or custom link
      if (tokenHash && type && mounted) {
        setStatus('processing')
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'signup' | 'email' | 'recovery' })
        if (!mounted) return
        if (error) {
          setStatus('error')
          return
        }
        didRedirect.current = true
        setStatus('redirecting')
        if (type === 'recovery') {
          const isBookingReturn = /^\/book\/[^/]+$/.test(redirectTo)
          if (isBookingReturn) {
            doRedirect(`${redirectTo}/update-password`)
          } else {
            doRedirect(`/login/update-password?next=${encodeURIComponent(redirectTo)}`)
          }
        } else {
          doRedirect(redirectTo.startsWith('/') ? redirectTo : `/crm/dashboard`)
        }
        return
      }

      // 2) PKCE flow – Supabase redirects with ?code=... (type=recovery or flow=recovery for password reset)
      const code = searchParams.get('code')
      const codeType = searchParams.get('type')
      const flow = searchParams.get('flow')
      if (code && mounted) {
        setStatus('processing')
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!mounted) return
        if (codeError) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session && mounted) {
            didRedirect.current = true
            setStatus('redirecting')
            const hadResetCookie = !!cookieNext
            const isRecovery = codeType === 'recovery' || flow === 'recovery' || hadResetCookie
            const isBookingReturn = /^\/book\/[^/]+$/.test(redirectTo)
            if (isRecovery) {
              if (isBookingReturn) doRedirect(`${redirectTo}/update-password`)
              else doRedirect(`/login/update-password?next=${encodeURIComponent(redirectTo)}`)
            } else if (isBookingReturn) {
              doRedirect(`${redirectTo}/update-password`)
            } else {
              doRedirect(redirectTo.startsWith('/') ? redirectTo : '/crm/dashboard')
            }
            return
          }
          setStatus('error')
          return
        }
        didRedirect.current = true
        setStatus('redirecting')
        // Recovery if explicit type/flow or if they had the reset cookie (clicked link from our forgot-password email)
        const hadResetCookie = !!cookieNext
        const isRecovery = codeType === 'recovery' || flow === 'recovery' || hadResetCookie
        const isBookingReturn = /^\/book\/[^/]+$/.test(redirectTo)
        if (isRecovery) {
          if (isBookingReturn) {
            doRedirect(`${redirectTo}/update-password`)
          } else {
            doRedirect(`/login/update-password?next=${encodeURIComponent(redirectTo)}`)
          }
        } else if (isBookingReturn) {
          doRedirect(`${redirectTo}/update-password`)
        } else {
          doRedirect(redirectTo.startsWith('/') ? redirectTo : '/crm/dashboard')
        }
        return
      }

      // 3) Hash (implicit flow) – Supabase redirects with #access_token=... (type=recovery may be missing in hash)
      if (hash) {
        const params = new URLSearchParams(hash.replace(/^#/, ''))
        const hashType = params.get('type')
        const isBookingReturn = /^\/book\/[^/]+$/.test(redirectTo)
        // If return path is booking, they came from forgot-password → always send to set new password first
        const isRecovery = hashType === 'recovery' || isBookingReturn
        await new Promise((r) => setTimeout(r, 500))
        if (!mounted) return
        const { data: { session } } = await supabase.auth.getSession()
        if (!session && mounted) {
          setStatus('error')
          return
        }
        didRedirect.current = true
        setStatus('redirecting')
        if (isRecovery) {
          if (isBookingReturn) {
            doRedirect(`${redirectTo}/update-password`)
          } else {
            doRedirect(`/login/update-password?next=${encodeURIComponent(redirectTo)}`)
          }
        } else {
          doRedirect(redirectTo.startsWith('/') ? redirectTo : '/crm/dashboard')
        }
        return
      }

      // 4) No token – already have session or direct visit
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      didRedirect.current = true
      setStatus('redirecting')
      if (session) {
        doRedirect(redirectTo.startsWith('/') ? redirectTo : '/crm/dashboard')
      } else {
        doRedirect('/login')
      }
    }

    handleCallback()

    const t = setTimeout(() => {
      if (!didRedirect.current) setStatus('error')
    }, 8000)
    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [router, searchParams])

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-2">This link has expired or is invalid.</p>
          <p className="text-[#7e8da8] text-sm mb-4">
            Some email clients open links in the background; if you just opened this link, request a new one below.
          </p>
          <a href="/login/forgot-password" className="text-[#00b8f5] underline">Request a new reset link</a>
          <span className="text-[#5a6a80] mx-2">·</span>
          <a href="/login" className="text-[#00b8f5] underline">Back to sign in</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
      <div className="text-[#5a6a80] text-sm">
        {status === 'processing' ? 'Confirming...' : 'Redirecting...'}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
