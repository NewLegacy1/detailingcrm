import './StepProgress.css'

interface StepProgressProps {
  steps: readonly string[]
  currentIndex: number
}

export function StepProgress({ steps, currentIndex }: StepProgressProps) {
  const progress = ((currentIndex + 1) / steps.length) * 100

  return (
    <div className="step-progress-wrap">
      <div className="step-progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="step-progress-bar__fill" style={{ width: `${progress}%` }} />
      </div>
      <nav className="step-progress-dots" aria-label="Onboarding progress">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`step-progress-dots__dot ${i <= currentIndex ? 'step-progress-dots__dot--active' : ''} ${i < currentIndex ? 'step-progress-dots__dot--done' : ''}`}
            aria-current={i === currentIndex ? 'step' : undefined}
          />
        ))}
      </nav>
    </div>
  )
}
