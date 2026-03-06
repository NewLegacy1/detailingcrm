'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isLightBackground, lightenHex } from '@/lib/utils'
import type { BookingProfilePageContext } from '@/components/booking/BookingProfileClient'

const BOOKING_BG_DEFAULT = '#212121'
const BOOKING_ACCENT_DEFAULT = '#4ade80'

const BOOKING_LIGHT_PRESET: Record<string, string> = {
  '--text': '#0f172a',
  '--text-1': '#0f172a',
  '--text-2': '#475569',
  '--text-3': '#64748b',
  '--text-muted': '#64748b',
  '--border': 'rgba(0, 0, 0, 0.08)',
  '--border-hi': 'rgba(0, 0, 0, 0.14)',
  '--booking-surface': 'rgba(0, 0, 0, 0.05)',
}
const BOOKING_DARK_PRESET: Record<string, string> = {
  '--text': '#e5e5e5',
  '--text-1': '#e5e5e5',
  '--text-2': '#a3a3a3',
  '--text-3': '#737373',
  '--text-muted': '#737373',
  '--border': 'rgba(255, 255, 255, 0.08)',
  '--border-hi': 'rgba(255, 255, 255, 0.12)',
  '--booking-surface': 'rgba(255, 255, 255, 0.04)',
}

function clearPasswordResetNextCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = 'password_reset_next=; path=/; max-age=0'
}

interface BookingUpdatePasswordClientProps {
  context: BookingProfilePageContext
}

export function BookingUpdatePasswordClient({ context }: BookingUpdatePasswordClientProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  const bookingStyle = useMemo(() => {
    const accent = (context.accentColor ?? context.primaryColor ?? BOOKING_ACCENT_DEFAULT).trim() || BOOKING_ACCENT_DEFAULT
    const bg = (context.primaryColor ?? '').trim() || BOOKING_BG_DEFAULT
    const isLight = isLightBackground(bg)
    const preset = isLight ? BOOKING_LIGHT_PRESET : BOOKING_DARK_PRESET
    const headerOverride = (context.bookingHeaderTextColor ?? '').trim()
    const bodyOverride = (context.bookingTextColor ?? '').trim()
    const useHeaderOverride = headerOverride && (isLight ? !isLightBackground(headerOverride) : isLightBackground(headerOverride))
    const useBodyOverride = bodyOverride && (isLight ? !isLightBackground(bodyOverride) : isLightBackground(bodyOverride))
    const cardBg = !isLight && bg ? lightenHex(bg, 0.18) : undefined
    const headerVar = useHeaderOverride ? { ['--booking-header-text']: headerOverride } : {}
    const bodyVars = useBodyOverride
      ? {
          ['--text']: bodyOverride,
          ['--text-1']: bodyOverride,
          ['--text-2']: bodyOverride,
          ['--text-3']: bodyOverride,
          ['--text-muted']: bodyOverride,
        }
      : {}
    return {
      ['--accent']: accent,
      ['--booking-bg']: bg,
      background: bg,
      ...(cardBg ? { ['--booking-card-bg']: cardBg } : {}),
      ...preset,
      ...headerVar,
      ...bodyVars,
    } as unknown as React.CSSProperties
  }, [context])

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError(err.message)
        return
      }
      setSuccess(true)
      clearPasswordResetNextCookie()
      setTimeout(() => router.push(`/book/${context.slug}?signin=1`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (hasSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={bookingStyle}>
        <div className="text-center max-w-sm">
          <p className="text-[var(--text-2)] mb-4">This link has expired. Request a new one from the booking page.</p>
          <Link
            href={`/book/${context.slug}`}
            className="text-[var(--accent)] font-medium underline"
          >
            Back to booking
          </Link>
        </div>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-xl border border-[var(--border-hi)] bg-[var(--booking-surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]'

  return (
    <div className="min-h-screen flex flex-col" style={bookingStyle}>
      <header
        className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border)]"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <Link
          href={`/book/${context.slug}`}
          className="p-2 -ml-2 rounded-lg text-[var(--text-2)] hover:bg-[var(--booking-surface)] hover:text-[var(--text)] transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold truncate flex-1 text-center" style={{ color: 'var(--booking-header-text, var(--text))' }}>
          Set new password
        </h1>
        <div className="w-16" aria-hidden />
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
        <p className="text-sm text-[var(--text-2)] mb-6">
          Set a new password for your account with {context.businessName}. You’ll then be asked to sign in on the booking page.
        </p>

        {success ? (
          <p className="text-[var(--accent)] text-sm">Password updated. Redirecting you back to the booking page to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}
            <label className="block">
              <span className="block text-sm font-medium text-[var(--text-2)] mb-1.5">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                placeholder="At least 6 characters"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-[var(--text-2)] mb-1.5">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                placeholder="Confirm new password"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
