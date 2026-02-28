import { useState, useRef } from 'react'
import type { OnboardingData } from '../types'
import './StepForm.css'
import './StepCustomerImport.css'

interface StepCustomerImportProps {
  data: OnboardingData
  updateData: (u: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const TEMPLATE_LINK = '#'

export function StepCustomerImport({ data, updateData, onNext, onBack }: StepCustomerImportProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const choice = data.importCustomers

  const handleFile = (file: File | null) => {
    updateData({ importFile: file || null })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => setDragOver(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null)
  }

  return (
    <div className="step-form step-fade">
      <h2 className="step-form__title">Import existing customers?</h2>
      <p className="step-form__subtitle">Upload a CSV to bring your client list in. Optional.</p>

      <div className="import-choice-cards">
        <button
          type="button"
          className={`import-choice-card ${choice === 'yes' ? 'card--selected' : ''}`}
          onClick={() => updateData({ importCustomers: 'yes' })}
        >
          Yes, I have a list
        </button>
        <button
          type="button"
          className={`import-choice-card ${choice === 'no' ? 'card--selected' : ''}`}
          onClick={() => updateData({ importCustomers: 'no', importFile: null })}
        >
          No, I'll add them later
        </button>
      </div>

      {choice === 'yes' && (
        <div className="import-drop-zone">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="import-drop-zone__input"
            onChange={onInputChange}
          />
          <div
            className={`import-drop-zone__area ${dragOver ? 'import-drop-zone__area--active' : ''} ${data.importFile ? 'import-drop-zone__area--has-file' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            {data.importFile ? (
              <span className="import-drop-zone__filename">{data.importFile.name}</span>
            ) : (
              <>
                <span className="import-drop-zone__text">Drop CSV here or click to upload</span>
                <a href={TEMPLATE_LINK} className="import-drop-zone__link" onClick={(e) => e.stopPropagation()}>
                  Download template
                </a>
              </>
            )}
          </div>
        </div>
      )}

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
