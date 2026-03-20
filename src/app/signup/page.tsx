'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DetailOpsNativeSignup } from '@/components/login/DetailOpsNativeSignup'

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

  /** Session cookies + DB trigger can lag slightly after signUp; avoid sending users to /onboarding (paywall) when orgId isn’t readable yet. */
  async function fetchOrgIdAfterSignup(): Promise<string | null> {
    const waits = [0, 80, 160, 320, 500, 750, 1100, 1600, 2200]
    for (const ms of waits) {
      if (ms > 0) await new Promise((r) => setTimeout(r, ms))
      const meRes = await fetch('/api/onboarding/me', { credentials: 'same-origin' })
      if (!meRes.ok) continue
      const meData = (await meRes.json()) as { orgId?: string | null }
      const id = typeof meData?.orgId === 'string' ? meData.orgId : null
      if (id) return id
    }
    return null
  }

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
        await supabase.auth.getSession()
        await fetch('/api/onboarding/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone || undefined, sms_consent: smsConsent }),
        })
        const orgId = await fetchOrgIdAfterSignup()
        if (orgId) {
          window.location.assign(`/signup/${orgId}`)
          return
        }
        setLoading(false)
        router.replace(`/login?redirectTo=${encodeURIComponent('/signup')}`)
        return
      } else {
        setError('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <DetailOpsNativeSignup
      name={name}
      onNameChange={setName}
      businessName={businessName}
      onBusinessNameChange={setBusinessName}
      phone={phone}
      onPhoneChange={setPhone}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      smsConsent={smsConsent}
      onSmsConsentChange={setSmsConsent}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
    />
  )
}
