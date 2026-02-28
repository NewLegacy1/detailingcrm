'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronRight, Check } from 'lucide-react'

const STEPS = [
  { key: 'en_route', label: 'En route', status: 'en_route' as const },
  { key: 'start', label: 'Start job', status: 'in_progress' as const },
  { key: 'complete', label: 'Complete job', status: 'done' as const },
  { key: 'checklist', label: 'Checklist' },
  { key: 'payment', label: 'Payment' },
]

const SWIPE_THRESHOLD_PX = 25

function statusToIndex(status: string): number {
  if (status === 'scheduled') return -1
  if (status === 'en_route') return 0
  if (status === 'in_progress') return 1
  if (status === 'done') return 2
  return 2
}

export interface JobWorkflowSwipeProps {
  status: string
  onStatusChange: (newStatus: 'en_route' | 'in_progress' | 'done') => Promise<void> | void
  onRequestComplete?: () => void
  onPaymentClick?: () => void
  /** When true, checklist modal is open – bar shows Checklist step and cannot advance until it’s closed */
  checklistOpen?: boolean
  isPaid?: boolean
  disabled?: boolean
}

export function JobWorkflowSwipe({
  status,
  onStatusChange,
  onRequestComplete,
  onPaymentClick,
  checklistOpen = false,
  isPaid = false,
  disabled = false,
}: JobWorkflowSwipeProps) {
  const currentIndex = statusToIndex(status)
  const barRef = useRef<HTMLDivElement>(null)
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [showSuccessCheck, setShowSuccessCheck] = useState(false)

  /** Refs for native touch handlers so they always see latest values and can update state */
  const touchStartXRef = useRef<number | null>(null)
  const goNextRef = useRef<() => void>(() => {})
  const canAdvanceRef = useRef(false)
  const setDragStartXRef = useRef(setDragStartX)
  const setDragOffsetRef = useRef(setDragOffset)
  setDragStartXRef.current = setDragStartX
  setDragOffsetRef.current = setDragOffset

  /** Which step to show: 0 En route, 1 Start job, 2 Complete job, 3 Checklist (modal), 4 Payment. When checklist is open show 3; when done we show 4. */
  const displayIndex =
    currentIndex === -1 ? 0
    : currentIndex === 0 ? 1
    : currentIndex === 1
      ? (checklistOpen ? 3 : 2)  // in_progress: show Checklist if modal open, else Complete job
    : 4
  const canAdvance =
    !checklistOpen &&
    (currentIndex < 2 || (currentIndex === 2 && (onPaymentClick != null))) &&
    !disabled
  canAdvanceRef.current = canAdvance

  const handleAdvance = useCallback(
    async (toIndex: number) => {
      if (toIndex <= currentIndex || disabled) return
      if (toIndex === 0) {
        await onStatusChange('en_route')
        return
      }
      if (toIndex === 1) {
        await onStatusChange('in_progress')
        return
      }
      if (toIndex === 2) {
        if (onRequestComplete) onRequestComplete()
        else await onStatusChange('done')
        return
      }
      if (toIndex === 3 && onPaymentClick) onPaymentClick()
    },
    [currentIndex, disabled, onStatusChange, onRequestComplete, onPaymentClick]
  )

  const goNext = useCallback(() => {
    const next = currentIndex + 1
    if (next <= 3) {
      handleAdvance(next)
      // Only show success check when we're not opening the checklist (so user doesn’t think they’re done)
      if (next !== 2) {
        setShowSuccessCheck(true)
        setTimeout(() => setShowSuccessCheck(false), 600)
      }
    }
  }, [currentIndex, handleAdvance])
  goNextRef.current = goNext

  /** Native touch handling only – no reliance on React synthetic events or pointer/touch order */
  useEffect(() => {
    const el = barRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (disabled || e.touches.length === 0) return
      e.preventDefault()
      const x = e.touches[0].clientX
      touchStartXRef.current = x
      setDragStartXRef.current(x)
      setDragOffsetRef.current(0)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartXRef.current === null || e.touches.length === 0) return
      e.preventDefault()
      const offset = e.touches[0].clientX - touchStartXRef.current
      setDragOffsetRef.current(offset)
    }

    const onTouchEnd = (e: TouchEvent) => {
      const startX = touchStartXRef.current
      if (startX === null || e.changedTouches.length === 0) return
      const endX = e.changedTouches[0].clientX
      const delta = endX - startX
      touchStartXRef.current = null
      setDragStartXRef.current(null)
      setDragOffsetRef.current(0)
      if (canAdvanceRef.current && delta > SWIPE_THRESHOLD_PX) goNextRef.current()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [disabled])

  /** Pointer events for mouse / non-touch (desktop) */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.pointerType === 'touch') return
      const x = e.clientX
      setDragStartX(x)
      setDragOffset(0)
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [disabled]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartX === null) return
      setDragOffset(e.clientX - dragStartX)
    },
    [dragStartX]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      if (dragStartX === null) return
      const delta = e.clientX - dragStartX
      setDragStartX(null)
      setDragOffset(0)
      if (canAdvance && delta > SWIPE_THRESHOLD_PX) goNext()
    },
    [dragStartX, canAdvance, goNext]
  )

  const isStepCompleted = (i: number) =>
    (i === 0 && currentIndex >= 0) ||
    (i === 1 && currentIndex >= 1) ||
    (i >= 2 && i <= 3 && currentIndex >= 2) ||
    (i === 4 && currentIndex >= 2 && isPaid)

  return (
    <div className="w-full">
      <p className="section-label mb-2 text-xs text-[var(--text-muted)]">
        Swipe right to advance
      </p>
      <div
        role="group"
        aria-label="Job workflow: En route, Start job, Complete job, Checklist, Payment"
        className="relative flex items-center overflow-hidden rounded-xl border border-[var(--border)]"
      >
        {showSuccessCheck && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg pointer-events-none"
            style={{ background: 'var(--accent)' }}
            aria-hidden
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 scale-110 transition-transform duration-150">
              <Check className="h-6 w-6 text-white" strokeWidth={3} />
            </span>
          </div>
        )}
        <div
          ref={barRef}
          className="flex flex-1 select-none items-center justify-between overflow-hidden rounded-lg py-1.5 px-1"
          style={{ background: 'var(--accent)', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={(e) => {
            if (e.pointerType === 'touch') return
            if (dragStartX !== null) {
              ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
              setDragStartX(null)
              setDragOffset(0)
            }
          }}
        >
          <div className="relative flex min-h-[40px] w-full flex-1 items-center">
            <div
              className="flex w-full flex-1"
              style={{
                transform: `translateX(calc(-${displayIndex * 100}% + ${dragOffset}px))`,
                transition: dragStartX === null ? 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
              }}
            >
              {STEPS.map((step, i) => {
                const completed = isStepCompleted(i)
                const isCurrent = i === displayIndex
                return (
                  <div
                    key={step.key}
                    className="flex w-full flex-shrink-0 items-center justify-center gap-2 px-4"
                    style={{ minWidth: '100%' }}
                  >
                    {completed ? (
                      <Check className="h-5 w-5 shrink-0 opacity-90" style={{ color: 'hsl(0 0% 100%)' }} />
                    ) : null}
                    <span
                      className="text-base font-semibold"
                      style={{
                        color: 'hsl(0 0% 100%)',
                        opacity: isCurrent ? 1 : 0.7,
                      }}
                    >
                      {step.label}
                    </span>
                    {canAdvance && (
                      <ChevronRight
                        className="h-5 w-5 shrink-0 transition-transform duration-200"
                        style={{
                          color: 'hsl(0 0% 100%)',
                          opacity: isCurrent ? 1 : 0.6,
                          transform: isCurrent && dragOffset > 30 ? 'translateX(4px) scale(1.1)' : 'translateX(0)',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === displayIndex ? 12 : 6,
              background: i <= displayIndex ? 'var(--accent)' : 'var(--surface-3)',
              opacity: i === displayIndex ? 1 : 0.6,
            }}
          />
        ))}
      </div>
    </div>
  )
}
