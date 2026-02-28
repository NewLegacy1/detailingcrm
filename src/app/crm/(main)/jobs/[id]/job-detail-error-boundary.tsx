'use client'

import { Component, type ReactNode } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class JobDetailErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[JobDetailErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-6 p-6 lg:p-8">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              We couldn’t load this job. You can go back to the jobs list and try again.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild variant="default">
                <Link href={crmPath('/jobs')}>Back to Jobs</Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
