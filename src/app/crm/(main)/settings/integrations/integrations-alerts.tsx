'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function IntegrationsAlerts() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null
  const googleConnected = searchParams.get('google_connected')
  const googleError = searchParams.get('google_error')
  if (!googleConnected && !googleError) return null

  if (googleError) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        Google Calendar connection failed. {decodeURIComponent(googleError)}
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-200">
      Google Calendar connected. Choose a company calendar below.
    </div>
  )
}
