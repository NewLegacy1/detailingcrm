'use client'

import { useState } from 'react'

interface AddressMapProps {
  address: string | null | undefined
  className?: string
  width?: number
  height?: number
}

/** Renders a static map pin for the given address via /api/map. */
export function AddressMap({ address, className = '', width = 415, height = 150 }: AddressMapProps) {
  const [error, setError] = useState(false)

  if (!address?.trim()) {
    return (
      <div
        className={`rounded-lg border border-[var(--border)] bg-[var(--surface-2)] min-h-[100px] flex items-center justify-center text-[var(--text-muted)] text-xs ${className}`}
      >
        No address
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-[var(--border)] bg-[var(--surface-2)] min-h-[100px] flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] text-xs ${className}`}
      >
        <span>Map unavailable</span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          Open in Google Maps
        </a>
      </div>
    )
  }

  const src = `/api/map?address=${encodeURIComponent(address.trim())}&w=${width}&h=${height}`

  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden min-h-[100px] ${className}`}
    >
      <img
        src={src}
        alt={`Map of ${address}`}
        className="w-full h-full min-h-[100px] object-cover"
        onError={() => setError(true)}
      />
    </div>
  )
}
