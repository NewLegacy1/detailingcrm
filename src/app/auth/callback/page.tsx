'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
      <div className="text-[#5a6a80] text-sm">Loading...</div>
    </div>
  )
}

/**
 * Handles redirects from Supabase Auth emails (confirm signup, magic link, reset password).
 * Supabase redirects here with tokens in the URL hash. The client processes them and we redirect.
 */
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'redirecting' | 'error'>('processing')

  useEffect(() => {
    let mounted = true

    async function handleCallback() {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const redirectTo = searchParams.get('redirectTo') ?? '/crm/dashboard'

      if (!hash) {
        // No hash - maybe already processed or direct visit
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session && mounted) {
          setStatus('redirecting')
          router.replace(redirectTo)
        } else if (mounted) {
          setStatus('redirecting')
          router.replace('/login')
        }
        return
      }

      // Parse hash for type (recovery = password reset flow)
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const type = params.get('type')

      // Supabase client auto-processes the hash when the page loads
      // Give it a moment, then check session and redirect
      await new Promise((r) => setTimeout(r, 500))

      if (!mounted) return

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session && mounted) {
        setStatus('error')
        return
      }

      setStatus('redirecting')

      if (type === 'recovery') {
        router.replace('/login/update-password')
      } else {
        router.replace(redirectTo)
      }
    }

    handleCallback()
    return () => { mounted = false }
  }, [router, searchParams])

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="text-center">
          <p className="text-red-400 mb-4">This link has expired or is invalid.</p>
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
