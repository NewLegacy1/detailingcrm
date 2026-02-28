'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface OrgBranding {
  businessName: string
  logoUrl: string | null
  primaryColor: string | null
  accentColor: string | null
  gmbRedirectUrl: string | null
  underFiveFeedbackEmail: string | null
}

const STARS = [1, 2, 3, 4, 5]

export default function ReviewPage() {
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''

  const [org, setOrg] = useState<OrgBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedStar, setSelectedStar] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/booking/context?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setOrg({
            businessName: data.businessName ?? 'Us',
            logoUrl: data.logoUrl ?? null,
            primaryColor: data.primaryColor ?? null,
            accentColor: data.accentColor ?? null,
            gmbRedirectUrl: data.gmbRedirectUrl ?? null,
            underFiveFeedbackEmail: data.underFiveFeedbackEmail ?? null,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [slug])

  function handleStarClick(star: number) {
    setSelectedStar(star)
    if (star >= 5 && org?.gmbRedirectUrl) {
      window.location.href = org.gmbRedirectUrl
    }
  }

  async function handleSubmitFeedback() {
    if (!selectedStar || selectedStar >= 5) return
    setSubmitting(true)
    try {
      await fetch('/api/review/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, rating: selectedStar, feedback }),
      })
    } catch (_) {}
    setSubmitted(true)
    setSubmitting(false)
  }

  const accent = org?.accentColor ?? org?.primaryColor ?? '#00b8f5'
  const bg = org?.primaryColor ?? '#212121'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="text-white/50 text-sm">Loading…</div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: bg }}>
        <div className="text-5xl mb-4">🙏</div>
        <h1 className="text-2xl font-bold text-white mb-2">Thank you for your feedback!</h1>
        <p className="text-white/60">We appreciate you taking the time to share your experience.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: bg }}>
      <div className="w-full max-w-md text-center space-y-6">
        {org?.logoUrl && (
          <div className="flex justify-center mb-2">
            <Image src={org.logoUrl} alt={org.businessName} width={120} height={40} className="h-12 w-auto object-contain" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">
          How was your experience with {org?.businessName ?? 'us'}?
        </h1>
        <p className="text-white/60 text-base">Your feedback helps us improve.</p>

        {/* Star rating */}
        <div className="flex justify-center gap-3 py-4">
          {STARS.map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => handleStarClick(star)}
              className="text-5xl transition-transform hover:scale-110 active:scale-95"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <span style={{ color: star <= (hoveredStar || selectedStar) ? '#facc15' : 'rgba(255,255,255,0.2)' }}>
                ★
              </span>
            </button>
          ))}
        </div>

        {/* Under-5 feedback form */}
        {selectedStar > 0 && selectedStar < 5 && (
          <div className="space-y-4 text-left">
            <p className="text-white/80 text-center">We're sorry to hear that. What could we improve?</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what happened..."
              rows={4}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': accent } as React.CSSProperties}
            />
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitFeedback}
              className="w-full rounded-xl py-3 px-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: accent }}
            >
              {submitting ? 'Sending…' : 'Send Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
