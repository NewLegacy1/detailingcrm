import { useState, useEffect } from 'react'
import './BookingPreviewMock.css'

interface BookingPreviewMockProps {
  businessName: string
  logoFile: File | null
  brandColor: string
}

export function BookingPreviewMock({ businessName, logoFile, brandColor }: BookingPreviewMockProps) {
  const [logoUrl, setLogoUrl] = useState<string>('')

  useEffect(() => {
    if (!logoFile) {
      setLogoUrl('')
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  return (
    <div className="booking-preview" style={{ '--brand': brandColor } as React.CSSProperties}>
      <div className="booking-preview__bar" />
      <div className="booking-preview__content">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="booking-preview__logo-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="booking-preview__logo-text">{businessName.slice(0, 2).toUpperCase() || 'AB'}</div>
        )}
        <h3 className="booking-preview__name">{businessName}</h3>
        <p className="booking-preview__tag">Book your detail</p>
        <div className="booking-preview__btn">Select service</div>
      </div>
    </div>
  )
}
