import type { OnboardingData, ServiceTemplate } from '../types'
import { SERVICE_TEMPLATES } from '../types'
import './StepForm.css'
import './StepOperatingDetails.css'

interface StepOperatingDetailsProps {
  data: OnboardingData
  updateData: (u: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function StepOperatingDetails({ data, updateData, onNext, onBack }: StepOperatingDetailsProps) {
  const selectedIds = new Set(data.services.map((s) => s.id))

  const toggle = (t: ServiceTemplate) => {
    if (selectedIds.has(t.id)) {
      updateData({ services: data.services.filter((s) => s.id !== t.id) })
    } else {
      updateData({ services: [...data.services, t] })
    }
  }

  return (
    <div className="step-form step-fade">
      <h2 className="step-form__title">Operating details</h2>
      <p className="step-form__subtitle">Pick the services you offer. You can edit times and prices later.</p>

      <div className="service-cards">
        {SERVICE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`service-card ${selectedIds.has(t.id) ? 'card--selected' : ''}`}
            onClick={() => toggle(t)}
          >
            <span className="service-card__name">{t.name}</span>
            <span className="service-card__meta">
              {t.durationMinutes} min · {formatPrice(t.priceCents)}
            </span>
            {t.description && (
              <span className="service-card__desc">{t.description}</span>
            )}
          </button>
        ))}
      </div>

      <div className="step-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn--primary" onClick={onNext}>
          Continue
          <span className="btn__arrow" aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
