import './BenefitsList.css'

const BENEFITS = [
  'Branded booking page in minutes',
  'Easy scheduling & payments',
  'Grow your client list',
]

export function BenefitsList() {
  return (
    <ul className="benefits-list">
      {BENEFITS.map((text, i) => (
        <li key={i} className="benefits-list__item">
          <span className="benefits-list__icon" aria-hidden>✓</span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}
