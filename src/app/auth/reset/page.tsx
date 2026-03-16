'use client'

/**
 * Dedicated entry point for password reset links.
 * Set Supabase Redirect URL to: https://yourdomain.com/auth/reset
 * Then the email link will land here with ?code=... (or token_hash&type=...).
 * Middleware will redirect /auth/reset?code=... to /auth/callback; this page
 * handles hash-only (fragment) tokens and shows debug info if nothing to do.
 */
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function AuthResetContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'show-debug'>('checking')

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const q = typeof window !== 'undefined' ? window.location.search : ''
    const hasQuery = searchParams.has('code') || (searchParams.has('token_hash') && searchParams.has('type'))
    const hasHash = hash && (
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      hash.includes('code=')
    )
    if (hasQuery) {
      setStatus('redirecting')
      window.location.replace(`/auth/callback${q}${hash}`)
      return
    }
    if (hasHash) {
      setStatus('redirecting')
      window.location.replace(`/auth/callback${q}${hash}`)
      return
    }
    setStatus('show-debug')
  }, [searchParams])

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="text-[#5a6a80] text-sm">Redirecting to set new password…</div>
      </div>
    )
  }

  if (status === 'show-debug') {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const hasHash = hash.length > 0
    const hashPreview = hasHash ? `${hash.substring(0, 50)}…` : '(none)'
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] p-4">
        <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#0c1018] p-6 text-sm">
          <h1 className="text-lg font-semibold text-[#dce6f5] mb-2">Password reset</h1>
          <p className="text-[#7e8da8] mb-4">
            If you clicked a reset link and landed here, the link may not have included the token.
          </p>
          <p className="text-[#5a6a80] text-xs font-mono break-all mb-4">
            Path: {path}<br />
            Query: {search || '(empty)'}<br />
            Hash: {hashPreview}
          </p>
          <p className="text-[#7e8da8] text-xs mb-4">
            In Supabase Dashboard → Authentication → URL Configuration, set <strong>Redirect URL</strong> to exactly:<br />
            <span className="text-[#00b8f5] font-mono">{typeof window !== 'undefined' ? `${window.location.origin}/auth/reset` : 'https://yourdomain.com/auth/reset'}</span>
          </p>
          <Link href="/login/forgot-password" className="text-[#00b8f5] underline">Request a new reset link</Link>
          <span className="text-[#5a6a80] mx-2">·</span>
          <Link href="/login" className="text-[#00b8f5] underline">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
      <div className="text-[#5a6a80] text-sm">Checking…</div>
    </div>
  )
}

export default function AuthResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="text-[#5a6a80] text-sm">Loading…</div>
      </div>
    }>
      <AuthResetContent />
    </Suspense>
  )
}
