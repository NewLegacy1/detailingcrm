'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** Optional class for the overlay container (e.g. z-[100] to appear above another modal) */
  className?: string
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center max-h-[100dvh] overflow-hidden', className)}>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[12px] transition-all duration-200 ease-out"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 max-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

export function DialogContent({ children, className }: DialogContentProps) {
  return (
    <div
      className={cn(
        'card relative w-full max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90dvh] min-h-0 overflow-y-auto overflow-x-hidden p-6 shadow-2xl overscroll-contain touch-pan-y',
        className
      )}
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  children: React.ReactNode
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4 space-y-1.5">{children}</div>
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return <h2 className={cn('text-lg font-semibold text-[var(--text)]', className)}>{children}</h2>
}

interface DialogCloseProps {
  onClick: () => void
  className?: string
}

export function DialogClose({ onClick, className }: DialogCloseProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute right-4 top-1 rounded-lg p-1 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
        className
      )}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  )
}
