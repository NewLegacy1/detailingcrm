import type { OnboardingData } from '../types'
import { DEFAULT_BRAND_COLOR } from '../types'
import { BookingPreviewMock } from '../BookingPreviewMock'
import './StepForm.css'
import './StepBookingCustomization.css'

interface StepBookingCustomizationProps {
  data: OnboardingData
  updateData: (u: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepBookingCustomization({ data, updateData, onNext, onBack }: StepBookingCustomizationProps) {
  return (
    <div className="step-form step-fade">
      <h2 className="step-form__title">Booking page</h2>
      <p className="step-form__subtitle">This is how your clients will see and book. Map and branding update live.</p>

      <div className="booking-customization-preview">
        <div className="booking-customization-preview__frame">
          <BookingPreviewMock
            businessName={data.businessName || 'Your Business'}
            logoFile={data.logoFile}
            brandColor={data.brandColor || DEFAULT_BRAND_COLOR}
          />
          <div className="booking-customization-preview__map" aria-hidden>
            <span className="booking-customization-preview__map-pin">📍</span>
            <span>Your location (map preview)</span>
          </div>
        </div>
      </div>

      <div className="step-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn--primary" onClick={() => { updateData({ bookingPreviewAccepted: true }); onNext(); }}>
          Continue
          <span className="btn__arrow" aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
