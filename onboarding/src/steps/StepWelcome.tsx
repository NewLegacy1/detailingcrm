import './StepWelcome.css'

interface StepWelcomeProps {
  userName: string
  onNext: () => void
}

export function StepWelcome({ userName, onNext }: StepWelcomeProps) {
  return (
    <div className="step-welcome step-fade">
      <h1 className="step-welcome__title">Welcome{userName ? `, ${userName}` : ''}!</h1>
      <p className="step-welcome__lead">
        Let's set up your detailing business.
      </p>
      <p className="step-welcome__text">
        Get a branded booking page, easy scheduling, and payments in minutes.
      </p>
      <button type="button" className="btn btn--primary" onClick={onNext}>
        Start Setup
        <span className="btn__arrow" aria-hidden>→</span>
      </button>
    </div>
  )
}
