'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import stepsData from './product-tour-steps.json'

const STEPS: { title: string; body: string; path?: string }[] = stepsData as { title: string; body: string; path?: string }[]

interface ProductTourProps {
  onComplete: () => void
  /** When true, do not save "tour completed" to the server (for testing via ?showTour=1). */
  skipPersist?: boolean
}

export function ProductTour({ onComplete, skipPersist = false }: ProductTourProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Keep step in sync with current page (fixes mobile when layout re-renders after navigation).
  // When pathname matches multiple steps (e.g. /crm/dashboard is step 1 and step 9), pick the step >= current so we don't jump backwards.
  // When still on welcome (step 0), don't sync so we don't leave the welcome screen on initial load.
  // When on the final step (no path), don't sync so we don't reset back when user clicked Next to reach "You are all set".
  useEffect(() => {
    if (step === 0 || step === STEPS.length - 1) return
    const matching: number[] = []
    for (let i = 0; i < STEPS.length; i++) {
      if (STEPS[i].path === pathname) matching.push(i)
    }
    if (matching.length === 0) return
    const forward = matching.filter((i) => i >= step)
    const next = forward.length > 0 ? Math.min(...forward) : Math.max(...matching)
    setStep(next)
  }, [pathname, step])

  // Persist "tour in progress" so layout remounts (e.g. on Jobs page) don't hide the tour
  useEffect(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('crm_tour_in_progress', '1')
  }, [])

  async function markComplete() {
    if (saving) return
    setSaving(true)
    if (!skipPersist) {
      try {
        await fetch('/api/crm/product-tour/complete', { method: 'PATCH' })
      } catch {
        // ignore
      }
    }
    onComplete()
    setSaving(false)
  }

  function goNext() {
    const nextIndex = step + 1
    if (nextIndex >= STEPS.length) return
    const nextStep = STEPS[nextIndex]
    if (nextStep?.path) {
      const url = skipPersist ? `${nextStep.path}?showTour=1` : nextStep.path
      router.push(url)
    }
    setStep(nextIndex)
  }

  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      aria-modal
      role="dialog"
      aria-labelledby="product-tour-title"
    >
      <div
        className="fixed left-4 right-4 bottom-20 md:left-auto md:right-6 md:bottom-6 md:w-full md:max-w-md p-6 flex flex-col gap-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-xl"
        style={{ maxHeight: 'calc(100vh - 48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-3)]">
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={markComplete}
            disabled={saving}
            className="text-sm text-[var(--text-3)] hover:text-[var(--text-2)] underline disabled:opacity-50"
          >
            Skip tour
          </button>
        </div>

        <h2 id="product-tour-title" className="text-lg font-semibold text-[var(--text-1)]">
          {STEPS[step].title}
        </h2>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          {STEPS[step].body}
        </p>

        <div className="flex gap-2 justify-end pt-2">
          {isLast ? (
            <button
              type="button"
              onClick={markComplete}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Done'}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
