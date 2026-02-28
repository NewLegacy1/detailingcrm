'use client'

import { useState, useEffect } from 'react'

const QUERY = '(max-width: 768px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handle = () => setIsMobile(mql.matches)
    handle()
    mql.addEventListener('change', handle)
    return () => mql.removeEventListener('change', handle)
  }, [])

  return isMobile
}
