'use client'

import { MapPin } from 'lucide-react'

interface NavigateButtonProps {
  href: string
}

export function NavigateButton({ href }: NavigateButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-colors"
    >
      <MapPin className="h-3.5 w-3.5" />
      Navigate
    </a>
  )
}
