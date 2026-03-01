'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { AuthHeroPanel } from '@/components/AuthHeroPanel'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
})


const inputClass =
  'w-full py-3.5 px-5 rounded-full border border-[rgba(255,255,255,0.07)] bg-[#0c1018] text-[0.88rem] text-[#eef0f2] placeholder:text-[#64748b] outline-none transition-[border-color,box-shadow,background] focus:border-[rgba(0,184,245,0.4)] focus:bg-[#0d1319] focus:shadow-[0_0_0_3px_rgba(0,184,245,0.08)]'
const submitBtnClass =
  'w-full py-[15px] rounded-full border-0 text-white text-[0.95rem] font-medium tracking-wide cursor-pointer transition-[opacity,transform,box-shadow] hover:opacity-90 hover:shadow-[0_6px_28px_rgba(0,184,245,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [abVariant, setAbVariant] = useState<'a' | 'b' | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const business = params.get('business')
    const emailParam = params.get('email')
    const ab = params.get('ab')
    if (business) setBusinessName(decodeURIComponent(business))
    if (emailParam) setEmail(decodeURIComponent(emailParam))
    if (ab === 'a' || ab === 'b') setAbVariant(ab)
  }, [])

  const [password, setPassword] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    if (!smsConsent) {
      setError('Please agree to receive SMS to continue.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: baseUrl ? `${baseUrl}/auth/callback` : undefined,
          data: {
            full_name: name,
            business_name: businessName || undefined,
            phone: phone || undefined,
            sms_consent: smsConsent,
            landing_ab: abVariant || undefined,
          },
        },
      })
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      if (data.session) {
        await fetch('/api/onboarding/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone || undefined, sms_consent: smsConsent }),
        })
        const meRes = await fetch('/api/onboarding/me')
        const meData = await meRes.json()
        const orgId = meData?.orgId ?? null
        if (orgId) {
          router.push(`/signup/${orgId}`)
          return
        }
        router.push('/onboarding')
      } else {
        setError('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className={`auth-hero-bg min-h-screen flex items-center justify-center px-4 py-8 ${plusJakarta.className}`}>
      <div className="relative w-full flex items-center justify-center">
        <div className="auth-hero-glow" aria-hidden />
        <div className="auth-card w-[1100px] max-w-[98vw] min-h-[520px] h-[620px] max-h-[90vh] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[45%_55%] shadow-2xl border border-[rgba(255,255,255,0.07)] relative bg-[#101620]">
        <div className="hidden md:block relative bg-[#0c1018] overflow-hidden min-h-[280px]">
          <AuthHeroPanel />
        </div>

        <div className="flex flex-col flex-1 min-h-0 bg-[#101620] md:border-l border-[rgba(255,255,255,0.07)]">
          <div className="flex-1 min-h-0 overflow-y-auto auth-panel-scroll flex flex-col justify-center items-center py-10 md:py-12 px-6 sm:px-12 md:px-16">
            <h1 className="text-[1.6rem] font-bold text-[#dce6f5] mb-1.5 tracking-tight">
              Create your account
            </h1>
            <p className="text-[0.82rem] text-[#4a5568] mb-8">
              Sign up for DetailOps — we'll create your business and booking page.
            </p>
            <form
              action="javascript:void(0)"
              method="post"
              onSubmit={handleSubmit}
                className="w-full max-w-[360px] flex flex-col gap-3"
              >
                {error && (
                  <div className="rounded-full bg-red-500/20 px-4 py-2.5 text-sm text-red-200">{error}</div>
                )}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business or company name"
                  className={inputClass}
                  required
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                  className={inputClass}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eg. you@detailops.com"
                  className={inputClass}
                  required
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
                <label className="flex items-center gap-2 text-sm text-[#7e8da8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="rounded border-[var(--border)]"
                  />
                  I agree to receive SMS from DetailOps about my account and bookings
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className={submitBtnClass}
                  style={{
                    background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                    boxShadow: '0 4px 20px rgba(0,184,245,0.35)',
                  }}
                >
                  {loading ? 'Creating account...' : 'Continue →'}
                </button>
            </form>
          <p className="mt-1 text-[0.82rem] text-[#3a4a60] text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00b8f5] underline font-medium">
              Sign in
            </Link>
          </p>
          </div>
          <div className="shrink-0 flex justify-center gap-5 py-4 px-6 text-[0.72rem] text-[#2a3548]">
            <Link href="/crm/legal/privacy" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Privacy policy</Link>
            <Link href="/crm/legal/terms" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Terms &amp; conditions</Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
