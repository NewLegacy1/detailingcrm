'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
})

const inputClass =
  'w-full py-3.5 px-5 rounded-full border border-[rgba(255,255,255,0.07)] bg-[#0c1018] text-[0.88rem] text-[#eef0f2] placeholder:text-[#64748b] outline-none transition-[border-color,box-shadow,background] focus:border-[rgba(0,184,245,0.4)] focus:bg-[#0d1319] focus:shadow-[0_0_0_3px_rgba(0,184,245,0.08)]'
const submitBtnClass =
  'w-full py-[15px] rounded-full border-0 text-white text-[0.95rem] font-medium tracking-wide cursor-pointer transition-[opacity,transform,box-shadow] hover:opacity-90 hover:shadow-[0_6px_28px_rgba(0,184,245,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

type InviteInfo = { email: string; orgName: string; role: string }

function JoinPageContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [sessionUser, setSessionUser] = useState<{ email: string } | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [signupError, setSignupError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token?.trim()) {
      setInviteError('Missing invite link')
      setLoadingInvite(false)
      return
    }
    fetch(`/api/invite/join?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: InviteInfo) => setInvite(data))
      .catch(() => setInviteError('Invalid or expired link'))
      .finally(() => setLoadingInvite(false))
  }, [token])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setSessionUser({ email: session.user.email })
    })
  }, [])

  const emailMatches = invite && sessionUser && sessionUser.email.toLowerCase() === invite.email.toLowerCase()

  async function handleAccept() {
    if (!token || !invite) return
    setLoading(true)
    setSignupError(null)
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSignupError(data.error || 'Failed to accept invite')
        return
      }
      window.location.href = '/crm/dashboard'
    } catch {
      setSignupError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !invite) return
    setLoading(true)
    setSignupError(null)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          emailRedirectTo: baseUrl ? `${baseUrl}/auth/callback` : undefined,
          data: { full_name: name.trim() || undefined },
        },
      })
      if (error) {
        if (error.message.includes('already registered')) {
          setSignupError('An account with this email already exists. Sign in first, then use this link again.')
        } else {
          setSignupError(error.message)
        }
        return
      }
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSignupError(data.error || 'Account created but could not join team. Sign in and open this link again.')
        return
      }
      window.location.href = '/crm/dashboard'
    } catch {
      setSignupError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loadingInvite) {
    return (
      <div className={`auth-hero-bg min-h-screen flex items-center justify-center ${plusJakarta.className}`}>
        <p className="text-[#64748b] relative z-[1]">Loading…</p>
      </div>
    )
  }

  if (inviteError || !invite) {
    return (
      <div className={`auth-hero-bg min-h-screen flex items-center justify-center px-4 ${plusJakarta.className}`}>
        <div className="relative w-full flex items-center justify-center">
          <div className="auth-hero-glow" aria-hidden />
          <div className="max-w-md w-full rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#101620] p-8 text-center relative z-[1]">
            <h1 className="text-xl font-bold text-[#dce6f5] mb-2">Invalid or expired link</h1>
            <p className="text-[#5a6a80] text-sm mb-6">{inviteError}</p>
            <Link href="/login" className="text-[#00b8f5] underline font-medium">Sign in</Link>
            {' · '}
            <Link href="/signup" className="text-[#00b8f5] underline font-medium">Sign up</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`auth-hero-bg min-h-screen flex items-center justify-center px-4 py-8 ${plusJakarta.className}`}>
      <div className="relative w-full flex items-center justify-center">
        <div className="auth-hero-glow" aria-hidden />
        <div className="auth-card w-[480px] max-w-[98vw] rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#101620] p-8 relative z-[1]">
        <h1 className="text-[1.5rem] font-bold text-[#dce6f5] mb-1">You&apos;re invited</h1>
        <p className="text-[#5a6a80] text-sm mb-6">
          <strong className="text-[#c8d5e8]">{invite.orgName}</strong> invited you to join as <strong className="text-[#c8d5e8]">{invite.role}</strong>.
        </p>

        {sessionUser ? (
          emailMatches ? (
            <div className="space-y-4">
              <p className="text-sm text-[#7e8da8]">Signed in as {sessionUser.email}</p>
              {signupError && <div className="rounded-lg bg-red-500/20 px-4 py-2.5 text-sm text-red-200">{signupError}</div>}
              <button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className={submitBtnClass}
                style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}
              >
                {loading ? 'Joining…' : `Join ${invite.orgName}`}
              </button>
              <p className="text-xs text-[#3a4a60]">
                Not you? <Link href="/login" className="text-[#00b8f5] underline">Sign in with a different account</Link>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#7e8da8]">
                This invite was sent to <strong className="text-[#c8d5e8]">{invite.email}</strong>. You&apos;re signed in as {sessionUser.email}.
              </p>
              <p className="text-sm text-[#5a6a80]">
                Sign out and sign in with {invite.email}, or create an account with that email below.
              </p>
              <Link
                href="/signup"
                className="inline-block py-3 px-5 rounded-full border border-[rgba(0,184,245,0.3)] text-[#c8d5e8] text-sm font-medium hover:bg-[#1a2332]"
              >
                Create account with {invite.email}
              </Link>
              <p className="text-xs text-[#3a4a60]">
                <Link href="/login" className="text-[#00b8f5] underline">Sign in</Link> if you already have an account with that email.
              </p>
            </div>
          )
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <p className="text-sm text-[#7e8da8]">Create your account to join. Use the email this invite was sent to.</p>
            <input type="hidden" value={invite.email} readOnly />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
            <input
              type="email"
              value={invite.email}
              readOnly
              className={inputClass}
              style={{ opacity: 0.9 }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className={inputClass}
              required
              minLength={6}
            />
            {signupError && <div className="rounded-lg bg-red-500/20 px-4 py-2.5 text-sm text-red-200">{signupError}</div>}
            <button
              type="submit"
              disabled={loading}
              className={submitBtnClass}
              style={{ background: 'linear-gradient(135deg, #00b8f5, #00b8f5)', boxShadow: '0 4px 20px rgba(0,184,245,0.35)' }}
            >
              {loading ? 'Creating account…' : 'Create account & join'}
            </button>
            <p className="text-xs text-[#3a4a60]">
              Already have an account? <Link href={`/login?redirectTo=${encodeURIComponent(`/signup/join?token=${token}`)}`} className="text-[#00b8f5] underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
      </div>
    </div>
  )
}

function JoinPageFallback() {
  return (
    <div className="auth-hero-bg min-h-screen flex items-center justify-center">
      <p className="text-[#64748b] relative z-[1]">Loading…</p>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageFallback />}>
      <JoinPageContent />
    </Suspense>
  )
}
