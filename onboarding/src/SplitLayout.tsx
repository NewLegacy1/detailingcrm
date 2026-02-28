import { ReactNode } from 'react'
import { LeftPanel } from './LeftPanel'
import './SplitLayout.css'

export type OnboardingVariant = 'a' | 'b' | 'c'

interface SplitLayoutProps {
  variant: OnboardingVariant
  leftContent: ReactNode
  rightContent: ReactNode
  progressPercent: number
  stepLabel?: string
  /** For step-specific left copy */
  leftHeadline?: string
  leftSubline?: string
}

export function SplitLayout({
  variant,
  leftContent,
  rightContent,
  progressPercent,
  stepLabel,
  leftHeadline,
  leftSubline,
}: SplitLayoutProps) {
  const showLeftPanel = variant === 'a'

  return (
    <div className={`split-layout ${showLeftPanel ? 'split-layout--with-panel' : 'split-layout--minimal'}`}>
      {showLeftPanel && (
        <LeftPanel
          progressPercent={progressPercent}
          stepLabel={stepLabel}
          headline={leftHeadline}
          subline={leftSubline}
        >
          {leftContent}
        </LeftPanel>
      )}
      <main className="split-layout__right">
        {rightContent}
      </main>
    </div>
  )
}
