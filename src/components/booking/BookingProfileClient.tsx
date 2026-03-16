'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { isLightBackground, lightenHex } from '@/lib/utils'

export interface BookingProfilePageContext {
  slug: string
  businessName: string
  logoUrl: string | null
  primaryColor?: string | null
  accentColor?: string | null
  bookingHeaderTextColor?: string | null
  bookingTextColor?: string | null
}

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

interface BookingProfileClientProps {
  context: BookingProfilePageContext
}

export function BookingProfileClient({ context }: BookingProfileClientProps) {
  const router = useRouter()
  const [client, setClient] = useState<{ name: string; email: string; phone: string; address: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<'success' | 'error' | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })

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
    let cancelled = false
    setLoading(true)
    fetch(`/api/booking/me?slug=${encodeURIComponent(context.slug)}`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 401 || res.status === 404) {
          router.replace(`/book/${context.slug}`)
          return null
        }
        return res.ok ? res.json() : null
      })
      .then((data) => {
        if (cancelled) return
        if (data?.client) {
          const c = data.client
          setClient({ name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '' })
          setForm({ name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '' })
        } else if (data !== null) {
          router.replace(`/book/${context.slug}`)
        }
      })
      .catch(() => {
        if (!cancelled) router.replace(`/book/${context.slug}`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [context.slug, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveMessage(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/booking/me?slug=${encodeURIComponent(context.slug)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.client) {
        setClient({ name: data.client.name ?? '', email: data.client.email ?? '', phone: data.client.phone ?? '', address: data.client.address ?? '' })
        setSaveMessage('success')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage('error')
      }
    } catch {
      setSaveMessage('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bookingStyle}>
        <p className="text-[var(--text-muted)]">Loading your profile…</p>
      </div>
    )
  }

  if (!client) return null

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
          Your profile
        </h1>
        <div className="w-16" aria-hidden />
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
        <p className="text-sm text-[var(--text-2)] mb-6">
          Update your details below. They’ll be used when you book with {context.businessName}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-2)] mb-1.5">Full name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className={inputClass}
              placeholder="Your name"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-2)] mb-1.5">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-2)] mb-1.5">Phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass}
              placeholder="(555) 123-4567"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-2)] mb-1.5">Address</span>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={inputClass}
              placeholder="Service address"
            />
          </label>

          {saveMessage === 'success' && (
            <p className="text-sm text-green-500">Changes saved.</p>
          )}
          {saveMessage === 'error' && (
            <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </main>
    </div>
  )
}
