'use client'

import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { MosaicPanel } from '@/components/MosaicPanel'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
})


const inputClass =
  'w-full py-3.5 px-5 rounded-full border border-[rgba(255,255,255,0.07)] bg-[#0c1018] text-[0.88rem] text-[#eef0f2] placeholder:text-[#64748b] outline-none transition-[border-color,box-shadow,background] focus:border-[rgba(0,184,245,0.4)] focus:bg-[#0d1319] focus:shadow-[0_0_0_3px_rgba(0,184,245,0.08)]'
const submitBtnClass =
  'w-full py-[15px] rounded-full border-0 text-white text-[0.95rem] font-medium tracking-wide cursor-pointer transition-[opacity,transform,box-shadow] hover:opacity-90 hover:shadow-[0_6px_28px_rgba(0,184,245,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/crm/dashboard'

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(redirectTo)
        router.refresh()
      }
    }
    checkSession()
  }, [router, redirectTo])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        return
      }
      window.location.href = redirectTo
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
        <div className="auth-card w-[1100px] max-w-[98vw] min-h-[520px] h-[620px] max-h-[90vh] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-[45%_55%] shadow-2xl border border-[rgba(255,255,255,0.07)] relative bg-[#101620]">
        {/* Left panel - hidden on small screens */}
        <div className="hidden md:block relative bg-[#0c1018] overflow-hidden min-h-[280px]">
          <div
            className="absolute inset-0 pointer-events-none z-[5]"
            style={{ background: 'linear-gradient(to right, transparent 40%, #0c1018 100%)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[52%] pointer-events-none z-[5]"
            style={{ background: 'linear-gradient(to top, #0c1018 35%, transparent 100%)' }}
          />
          <MosaicPanel logoSrc="/detailopslogo.png" />
          <div className="absolute bottom-10 left-9 right-6 z-10 pt-7 border-t border-[rgba(0,184,245,0.1)]">
            <h2 className="text-[2rem] font-bold text-[#e8edf5] leading-tight tracking-tight mb-2.5">
              Run Your Detail Business
              <br />
              with <span className="font-light text-[#00b8f5] not-italic">Precision</span>
            </h2>
            <p className="text-[0.82rem] text-[#5a6a80] leading-relaxed max-w-[300px]">
              Schedule jobs, manage crews, track payments, and grow your mobile detailing operation — all in one place.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col flex-1 min-h-0 bg-[#101620] md:border-l border-[rgba(255,255,255,0.07)]">
          <div className="flex-1 min-h-0 overflow-y-auto auth-panel-scroll flex flex-col justify-center items-center py-10 md:py-12 px-6 sm:px-12 md:px-16">
          <h1 className="text-[1.6rem] font-bold text-[#dce6f5] mb-1.5 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-[0.82rem] text-[#4a5568] mb-8">
            Sign in to your DetailOps account
          </p>

          <form onSubmit={handleSignIn} className="w-full max-w-[360px] flex flex-col gap-3">
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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="password"
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
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
            <p className="mt-1 text-[0.82rem] text-[#3a4a60] text-center">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#00b8f5] underline font-medium">
                Sign up
              </Link>
            </p>
          </form>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-hero-bg min-h-screen flex items-center justify-center">
          <div className="text-[#64748b]">Loading...</div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  )
}
