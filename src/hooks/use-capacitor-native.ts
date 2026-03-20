'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

/** True when running inside the Capacitor iOS/Android shell (not mobile Safari). */
export function useCapacitorNative(): boolean {
  const [native, setNative] = useState(false)
  useEffect(() => {
    setNative(Capacitor.isNativePlatform())
  }, [])
  return native
}
