'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  BarChart3,
  PieChart,
  Users,
  Car,
  MessageSquare,
  FileText,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const ICON_MAP: Record<string, LucideIcon> = {
  ClipboardList,
  BarChart3,
  PieChart,
  Users,
  Car,
  MessageSquare,
  FileText,
  Wrench,
}

interface EmptyStateProps {
  /** Icon component (use in Client Components only) */
  icon?: LucideIcon
  /** Icon name for Server Components – use a key from ICON_MAP */
  iconName?: keyof typeof ICON_MAP
  headline: string
  subtext: string
  ctaLabel?: string
  ctaHref?: string
  ctaOnClick?: () => void
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  icon: IconProp,
  iconName,
  headline,
  subtext,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  className,
  children,
}: EmptyStateProps) {
  const Icon = iconName ? ICON_MAP[iconName] : IconProp
  if (!Icon) {
    throw new Error(
      'EmptyState requires either icon (client) or iconName (server). iconName must be one of: ' +
        Object.keys(ICON_MAP).join(', ')
    )
  }
  return (
    <div
      className={cn(
        'card flex flex-col items-center justify-center px-8 py-12 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-[var(--text-muted)]">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{headline}</h3>
      <p className="mb-6 max-w-sm text-sm text-[var(--text-secondary)]">
        {subtext}
      </p>
      {children}
      {(ctaLabel && (ctaHref || ctaOnClick)) && (
        <>
          {ctaHref ? (
            <Button asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          ) : (
            <Button onClick={ctaOnClick}>{ctaLabel}</Button>
          )}
        </>
      )}
    </div>
  )
}
