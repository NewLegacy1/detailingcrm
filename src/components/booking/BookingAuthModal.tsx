'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'signin' | 'signup'

interface BookingAuthModalProps {
  open: boolean
  mode: Mode
  onClose: () => void
  onSwitchMode: (mode: Mode) => void
  slug: string
  onSuccess: () => void
  /** Shown above the form (e.g. "Password updated. Please sign in with your new password.") */
  bannerMessage?: string | null
}

export function BookingAuthModal({
  open,
  mode,
  onClose,
  onSwitchMode,
  slug,
  onSuccess,
  bannerMessage,
}: BookingAuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)

    if (mode === 'signup') {
      const res = await fetch('/api/booking/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to create account.')
        setLoading(false)
        return
      }
    }

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error: signError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (signError) {
      setError(signError.message ?? 'Sign in failed.')
      setLoading(false)
      return
    }

    onSuccess()
    onClose()
    setLoading(false)
    setPassword('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden !border-0"
        style={{ background: 'transparent', border: 'none' } as React.CSSProperties}
      >
        <div
          className="min-h-full w-full p-6 rounded-[12px] overflow-y-auto"
          style={{ background: 'var(--booking-bg, #212121)' }}
        >
          <DialogClose onClick={onClose} className="text-[var(--text-muted)] hover:bg-[var(--booking-surface-hover)] hover:text-[var(--text)]" />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">{mode === 'signin' ? 'Sign in' : 'Create account'}</DialogTitle>
          </DialogHeader>
          {bannerMessage && (
            <p className="text-sm text-[var(--accent)] bg-[var(--booking-surface)] border border-[var(--border-hi)] rounded-lg px-3 py-2 mb-2" role="status">
              {bannerMessage}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}
            <div>
              <Label htmlFor="auth-email" className="text-[var(--text-2)] text-xs">Email *</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div>
              <Label htmlFor="auth-password" className="text-[var(--text-2)] text-xs">Password *</Label>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />
              {mode === 'signin' && (
                <p className="mt-1.5 text-xs text-right">
                  <Link
                    href={`/login/forgot-password?next=${encodeURIComponent('/book/' + slug)}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </p>
              )}
            </div>
            {mode === 'signup' && (
              <>
                <div>
                  <Label htmlFor="auth-name" className="text-[var(--text-2)] text-xs">Name</Label>
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <Label htmlFor="auth-phone" className="text-[var(--text-2)] text-xs">Phone</Label>
                  <Input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1 bg-[var(--booking-surface)] border-[var(--border-hi)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90">
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)] text-center">
              {mode === 'signin' ? (
                <>No account?{' '}
                  <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => onSwitchMode('signup')}>
                    Create one
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => onSwitchMode('signin')}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
