import type { OnboardingData } from '../types'
import type { OnboardingVariant } from '../SplitLayout'
import './StepForm.css'
import './StepIntegrations.css'

interface StepIntegrationsProps {
  variant: OnboardingVariant
  data: OnboardingData
  updateData: (u: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepIntegrations({ variant, data, updateData, onNext, onBack }: StepIntegrationsProps) {
  const forceStripe = variant === 'c'

  const handleSkip = () => {
    if (forceStripe) return
    onNext()
  }

  return (
    <div className="step-form step-fade">
      <h2 className="step-form__title">Integrations</h2>
      <p className="step-form__subtitle">Connect Stripe for payments and Google Calendar for scheduling.</p>

      <div className="integration-cards">
        <button
          type="button"
          className={`integration-card ${data.stripeConnected ? 'integration-card--connected' : ''}`}
          onClick={() => updateData({ stripeConnected: true })}
        >
          <span className="integration-card__icon" aria-hidden>💳</span>
          <span className="integration-card__name">Stripe</span>
          <span className="integration-card__status">
            {data.stripeConnected ? 'Connected ✓' : 'Connect Now'}
          </span>
        </button>
        <button
          type="button"
          className={`integration-card ${data.googleCalendarConnected ? 'integration-card--connected' : ''}`}
          onClick={() => updateData({ googleCalendarConnected: true })}
        >
          <span className="integration-card__icon" aria-hidden>📅</span>
          <span className="integration-card__name">Google Calendar</span>
          <span className="integration-card__status">
            {data.googleCalendarConnected ? 'Connected ✓' : 'Connect Now'}
          </span>
        </button>
      </div>

      <div className="step-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <div className="step-form__actions-right">
          {!forceStripe && (
            <button type="button" className="btn btn--ghost" onClick={handleSkip}>
              Skip for now
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={onNext}
            disabled={forceStripe && !data.stripeConnected}
          >
            Continue
            <span className="btn__arrow" aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
