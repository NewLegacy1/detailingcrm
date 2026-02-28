import { ReactNode } from 'react'
import { TESTIMONIALS } from './types'
import './LeftPanel.css'

interface LeftPanelProps {
  children: ReactNode
  progressPercent: number
  stepLabel?: string
  headline?: string
  subline?: string
}

export function LeftPanel({
  children,
  progressPercent,
  stepLabel,
  headline,
  subline,
}: LeftPanelProps) {
  const testimonial = TESTIMONIALS[0]

  return (
    <aside className="left-panel">
      <div className="left-panel__inner">
        <header className="left-panel__brand">
          <div className="left-panel__logo">DetailOps</div>
          <p className="left-panel__tagline">The Best CRM for Detailers</p>
        </header>

        <div className="left-panel__main">
          {headline && (
            <h1 className="left-panel__headline">{headline}</h1>
          )}
          {subline && (
            <p className="left-panel__subline">{subline}</p>
          )}
          {children}
        </div>

        <div className="left-panel__testimonial">
          <blockquote className="left-panel__quote">"{testimonial.quote}"</blockquote>
          <div className="left-panel__author">
            <span className="left-panel__avatar" aria-hidden />
            <span className="left-panel__author-name">{testimonial.author}</span>
            <span className="left-panel__author-location">{testimonial.location} detailer</span>
          </div>
        </div>

        <footer className="left-panel__footer">
          <span className="left-panel__powered">Powered by DetailOps</span>
          {stepLabel && (
            <span className="left-panel__progress-echo">{Math.round(progressPercent)}%</span>
          )}
        </footer>
      </div>
    </aside>
  )
}
