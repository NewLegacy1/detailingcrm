'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { crmPath } from '@/lib/crm-path'

function getClientLocalDateString(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * When Jobs is in Day view with no date in the URL, set the date to the
 * client's local "today" so the Jobs tab shows the same day as the user's
 * calendar and matches Schedule when they navigate.
 */
export function JobsDateSync() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const dateParam = searchParams.get('date')
    const view = searchParams.get('view')
    const isDayView = view !== 'list' && view !== 'kanban'
    if (!dateParam && isDayView) {
      router.replace(crmPath(`/jobs?date=${getClientLocalDateString()}`), { scroll: false })
    }
  }, [router, searchParams])

  return null
}
