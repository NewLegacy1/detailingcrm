import type { OnboardingData } from '../types'
import { DEFAULT_BRAND_COLOR } from '../types'
import { BookingPreviewMock } from '../BookingPreviewMock'
import './StepForm.css'

interface StepBusinessBasicsProps {
  data: OnboardingData
  updateData: (u: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepBusinessBasics({ data, updateData, onNext, onBack }: StepBusinessBasicsProps) {
  return (
    <div className="step-form step-fade">
      <h2 className="step-form__title">Business basics</h2>
      <p className="step-form__subtitle">Name, logo, and colors. We'll use these on your booking page.</p>

      <div className="step-form__grid">
        <div className="step-form__fields">
          <label className="field">
            <span className="field__label">Business name</span>
            <input
              type="text"
              className="field__input"
              value={data.businessName}
              onChange={(e) => updateData({ businessName: e.target.value })}
              placeholder="e.g. Nathan's Detailing"
              autoFocus
            />
          </label>
          <div className="field">
            <span className="field__label">Logo</span>
            <div className="field__file-wrap">
              <input
                type="file"
                accept="image/*"
                className="field__file-input"
                id="logo-upload"
                onChange={(e) => updateData({ logoFile: e.target.files?.[0] ?? null })}
              />
              <label htmlFor="logo-upload" className="field__file-label">
                {data.logoFile ? data.logoFile.name : 'Choose image...'}
              </label>
            </div>
          </div>
          <label className="field">
            <span className="field__label">Brand color</span>
            <div className="field__color-row">
              <input
                type="color"
                className="field__color-swatch"
                value={data.brandColor || DEFAULT_BRAND_COLOR}
                onChange={(e) => updateData({ brandColor: e.target.value })}
              />
              <input
                type="text"
                className="field__input"
                value={data.brandColor || DEFAULT_BRAND_COLOR}
                onChange={(e) => updateData({ brandColor: e.target.value })}
                placeholder="#2563eb"
              />
            </div>
          </label>
        </div>
        <div className="step-form__preview">
          <BookingPreviewMock
            businessName={data.businessName || 'Your Business'}
            logoFile={data.logoFile}
            brandColor={data.brandColor || DEFAULT_BRAND_COLOR}
          />
        </div>
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
