'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import LandingPage from '@/components/LandingPage'
import { LandingVariantB } from './LandingVariantB'

const COOKIE_NAME = 'landing_ab'
const COOKIE_PATH = '/'
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${COOKIE_PATH}; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export function LandingABWrapper() {
  const [variant, setVariant] = useState<'a' | 'b' | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const forceB = searchParams.get('variant') === 'b' || searchParams.get('ab') === 'b'
    let v = getCookie(COOKIE_NAME) as 'variant-a' | 'variant-b' | null

    if (forceB) {
      v = 'variant-b'
      setCookie(COOKIE_NAME, v)
    } else if (v !== 'variant-a' && v !== 'variant-b') {
      v = Math.random() < 0.5 ? 'variant-a' : 'variant-b'
      setCookie(COOKIE_NAME, v)
    }
    setVariant(v === 'variant-a' ? 'a' : 'b')
  }, [searchParams])

  if (variant === null) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="animate-pulse text-[#5a6a80] text-sm">Loading…</div>
      </div>
    )
  }

  return variant === 'a' ? <LandingPage /> : <LandingVariantB />
}
