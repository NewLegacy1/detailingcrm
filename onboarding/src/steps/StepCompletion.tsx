import { useState } from 'react'
import type { OnboardingData } from '../types'
import { Confetti } from '../Confetti'
import './StepCompletion.css'

interface StepCompletionProps {
  data: OnboardingData
  onFinish: () => void
}

export function StepCompletion({ data, onFinish }: StepCompletionProps) {
  const [confettiKey, setConfettiKey] = useState(0)

  return (
    <div className="step-complete step-fade">
      <Confetti key={confettiKey} />
      <div className="step-complete__icon" aria-hidden>✓</div>
      <h2 className="step-complete__title">Your booking page is live!</h2>
      <p className="step-complete__text">
        {data.businessName ? `${data.businessName} is ready. ` : ''}
        Share it with clients to start taking bookings.
      </p>
      <div className="step-complete__actions">
        <button type="button" className="btn btn--primary step-complete__btn" onClick={onFinish}>
          View & share booking page
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => setConfettiKey((k) => k + 1)}>
          🎉 Show confetti again
        </button>
      </div>
    </div>
  )
}
