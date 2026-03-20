'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { nativeAuthStyles as na } from '@/components/login/native-auth-styles'
import {
  NativeOnboardingShell,
  OnboardingPrimaryButton,
  OnboardingStepHeadline,
} from '@/components/onboarding/NativeOnboardingShell'

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
  const [nameFocus, setNameFocus] = useState(false)
  const [passFocus, setPassFocus] = useState(false)

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

  const emailMatches =
    invite && sessionUser && sessionUser.email.toLowerCase() === invite.email.toLowerCase()

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
          setSignupError(
            'An account with this email already exists. Sign in first, then use this link again.',
          )
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
        setSignupError(
          data.error || 'Account created but could not join team. Sign in and open this link again.',
        )
        return
      }
      window.location.href = '/crm/dashboard'
    } catch {
      setSignupError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const footer = (
    <>
      <p style={na.onboardingFooterNote}>
        <Link href="/privacy" style={na.legalLink}>
          Privacy
        </Link>
        <span style={{ color: 'rgba(90,106,128,0.5)', margin: '0 10px' }}>·</span>
        <Link href="/terms" style={na.legalLink}>
          Terms
        </Link>
      </p>
    </>
  )

  if (loadingInvite) {
    return (
      <NativeOnboardingShell showProgress={false} footer={footer}>
        <p style={{ color: '#5a6a80', fontSize: '0.95rem' }}>Loading…</p>
      </NativeOnboardingShell>
    )
  }

  if (inviteError || !invite) {
    return (
      <NativeOnboardingShell showProgress={false} footer={footer}>
        <OnboardingStepHeadline line1="Link" line2Accent="unavailable." />
        <p style={na.onboardingLead}>{inviteError}</p>
        <div style={{ ...na.onboardingGlassRow, flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <Link href="/login" style={{ ...na.signupLink, fontSize: '0.95rem' }}>
            Sign in
          </Link>
          <Link href="/signup" style={{ ...na.signupLink, fontSize: '0.95rem' }}>
            Create account
          </Link>
        </div>
      </NativeOnboardingShell>
    )
  }

  return (
    <NativeOnboardingShell showProgress={false} footer={footer}>
      <OnboardingStepHeadline line1="You're" line2Accent="invited." />
      <p style={na.onboardingLead}>
        <strong style={{ color: '#dce6ec' }}>{invite.orgName}</strong> invited you as{' '}
        <strong style={{ color: '#dce6ec' }}>{invite.role}</strong>.
      </p>

      {sessionUser ? (
        emailMatches ? (
          <>
            <p style={{ fontSize: '0.9rem', color: '#5a6a80', marginTop: 0, marginBottom: 12 }}>
              Signed in as {sessionUser.email}
            </p>
            {signupError ? <div style={{ ...na.authError, marginBottom: 12 }}>{signupError}</div> : null}
            <OnboardingPrimaryButton
              onClick={handleAccept}
              disabled={loading}
              style={{ width: '100%', flex: 'none' }}
            >
              {loading ? 'Joining…' : `Join ${invite.orgName}`}
              {!loading ? <span style={na.btnArrow}>→</span> : null}
            </OnboardingPrimaryButton>
            <p style={{ ...na.onboardingFooterNote, textAlign: 'left', marginTop: 20 }}>
              Not you?{' '}
              <Link href="/login" style={na.signupLink}>
                Sign in with a different account
              </Link>
            </p>
          </>
        ) : (
          <>
            <div style={{ ...na.onboardingGlassRow, flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
              <p style={{ fontSize: '0.9rem', color: '#5a6a80', margin: 0, lineHeight: 1.5 }}>
                This invite was sent to <strong style={{ color: '#dce6ec' }}>{invite.email}</strong>. You&apos;re
                signed in as <strong style={{ color: '#dce6ec' }}>{sessionUser.email}</strong>.
              </p>
              <p style={{ fontSize: '0.88rem', color: '#5a6a80', margin: 0, lineHeight: 1.5 }}>
                Sign out and sign in with {invite.email}, or create an account with that email.
              </p>
            </div>
            <Link
              href="/signup"
              style={{
                ...na.onboardingBtnSecondary,
                marginTop: 16,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: 1.35,
              }}
            >
              Create account with {invite.email}
            </Link>
            <p style={{ ...na.onboardingFooterNote, textAlign: 'left', marginTop: 16 }}>
              <Link href="/login" style={na.signupLink}>
                Sign in
              </Link>{' '}
              if you already use that email.
            </p>
          </>
        )
      ) : (
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.9rem', color: '#5a6a80', margin: 0, lineHeight: 1.5 }}>
            Create your account to join. Use the email this invite was sent to.
          </p>
          <div>
            <label style={na.fieldLabel} htmlFor="join-name">
              Full name
            </label>
            <input
              id="join-name"
              className="do-native-auth-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              onFocus={() => setNameFocus(true)}
              onBlur={() => setNameFocus(false)}
              style={{
                ...na.fieldInputNoIcon,
                ...(nameFocus ? na.fieldInputFocus : {}),
              }}
            />
          </div>
          <div>
            <label style={na.fieldLabel} htmlFor="join-email">
              Email
            </label>
            <input
              id="join-email"
              className="do-native-auth-input"
              type="email"
              value={invite.email}
              readOnly
              style={{
                ...na.fieldInputNoIcon,
                opacity: 0.92,
              }}
            />
          </div>
          <div>
            <label style={na.fieldLabel} htmlFor="join-password">
              Password
            </label>
            <input
              id="join-password"
              className="do-native-auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
              onFocus={() => setPassFocus(true)}
              onBlur={() => setPassFocus(false)}
              style={{
                ...na.fieldInputNoIcon,
                ...(passFocus ? na.fieldInputFocus : {}),
              }}
              autoComplete="new-password"
            />
          </div>
          {signupError ? <div style={na.authError}>{signupError}</div> : null}
          <OnboardingPrimaryButton type="submit" disabled={loading} style={{ width: '100%', flex: 'none' }}>
            {loading ? 'Creating account…' : 'Create account & join'}
            {!loading ? <span style={na.btnArrow}>→</span> : null}
          </OnboardingPrimaryButton>
          <p style={{ ...na.onboardingFooterNote, textAlign: 'center', marginTop: 8 }}>
            Already have an account?{' '}
            <Link
              href={`/login?redirectTo=${encodeURIComponent(`/signup/join?token=${token}`)}`}
              style={na.signupLink}
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </NativeOnboardingShell>
  )
}

function JoinPageFallback() {
  return (
    <NativeOnboardingShell showProgress={false}>
      <p style={{ color: '#5a6a80' }}>Loading…</p>
    </NativeOnboardingShell>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageFallback />}>
      <JoinPageContent />
    </Suspense>
  )
}
