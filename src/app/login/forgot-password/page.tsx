'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: baseUrl ? `${baseUrl}/auth/callback` : undefined,
      })
      if (err) {
        setError(err.message)
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`auth-hero-bg min-h-screen flex items-center justify-center px-4 py-8 ${plusJakarta.className}`}>
      <div className="relative w-full flex items-center justify-center">
        <div className="auth-hero-glow" aria-hidden />
        <div className="auth-card w-[1100px] max-w-[98vw] min-h-[520px] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[45%_55%] shadow-2xl border border-[rgba(255,255,255,0.07)] relative bg-[#101620]">
          <div className="hidden md:block relative bg-[#0c1018] overflow-hidden min-h-[280px]">
            <AuthHeroPanel />
          </div>

          <div className="flex flex-col flex-1 min-h-0 bg-[#101620] md:border-l border-[rgba(255,255,255,0.07)]">
            <div className="flex-1 min-h-0 overflow-y-auto auth-panel-scroll flex flex-col justify-center items-center py-10 md:py-12 px-6 sm:px-12 md:px-16">
              <div className="flex justify-center mb-4 md:mb-5 md:hidden">
                <Image src="/detailopslogo.png" alt="DetailOps" width={160} height={160} className="h-40 w-40 min-h-[160px] min-w-[160px] object-contain" />
              </div>
              <h1 className="text-[1.6rem] font-bold text-[#dce6f5] mb-1.5 tracking-tight text-center">
                Reset password
              </h1>
              <p className="text-[0.82rem] text-[#4a5568] mb-8 text-center max-w-[320px]">
                Enter your email and we will send you a link to reset your password.
              </p>

              {success ? (
                <div className="w-full max-w-[360px] text-center space-y-4">
                  <p className="text-[#86efac] text-sm">Check your email for a link to reset your password.</p>
                  <Link href="/login" className="text-[#00b8f5] underline font-medium">Back to sign in</Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="w-full max-w-[360px] flex flex-col gap-3">
                  {error && (
                    <div className="rounded-full bg-red-500/20 px-4 py-2.5 text-sm text-red-200">{error}</div>
                  )}
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="eg. you@detailops.com"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={submitBtnClass}
                    style={{
                      background: 'linear-gradient(135deg, #00b8f5, #00b8f5)',
                      boxShadow: '0 4px 20px rgba(0,184,245,0.35)',
                    }}
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              )}

              <p className="mt-6 text-[0.82rem] text-[#3a4a60] text-center">
                <Link href="/login" className="text-[#00b8f5] underline font-medium">Back to sign in</Link>
              </p>
            </div>

            <div className="shrink-0 flex justify-center gap-5 py-4 px-6 text-[0.72rem] text-[#2a3548]">
              <Link href="/crm/legal/privacy" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Privacy policy</Link>
              <Link href="/crm/legal/terms" className="text-[#2a3548] no-underline hover:text-[#4a6080]">Terms and conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
