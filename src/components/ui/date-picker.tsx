'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const dateInputBaseClass =
  'flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]/60 disabled:cursor-not-allowed disabled:opacity-50'

export const DateInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'>
>(({ className, ...props }, ref) => (
  <input
    type="date"
    ref={ref}
    className={cn(dateInputBaseClass, className)}
    {...props}
  />
))
DateInput.displayName = 'DateInput'

export const DateTimeInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'>
>(({ className, ...props }, ref) => (
  <input
    type="datetime-local"
    ref={ref}
    className={cn(dateInputBaseClass, className)}
    {...props}
  />
))
DateTimeInput.displayName = 'DateTimeInput'
