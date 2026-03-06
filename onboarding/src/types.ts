export interface ServiceTemplate {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  description?: string
}

export interface OnboardingData {
  // Business Basics
  businessName: string
  logoFile: File | null
  brandColor: string
  // Operating
  services: ServiceTemplate[]
  operatingHours: string
  // Booking (customization done in step)
  bookingPreviewAccepted: boolean
  // Integrations
  stripeConnected: boolean
  googleCalendarConnected: boolean
  // Import
  importCustomers: 'yes' | 'no' | null
  importFile: File | null
  // Meta
  userName: string
}

export const DEFAULT_BRAND_COLOR = '#2563eb'

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  { id: 'full-detail', name: 'Full Detail', durationMinutes: 120, priceCents: 25000, description: 'Interior + exterior' },
  { id: 'interior', name: 'Interior Detail', durationMinutes: 90, priceCents: 15000 },
  { id: 'exterior', name: 'Exterior Detail', durationMinutes: 60, priceCents: 12000 },
  { id: 'ceramic', name: 'Ceramic Coating', durationMinutes: 240, priceCents: 80000 },
  { id: 'quick-wash', name: 'Quick Wash', durationMinutes: 30, priceCents: 4500 },
  { id: 'headlight', name: 'Headlight Restoration', durationMinutes: 60, priceCents: 9999 },
]

export const TESTIMONIALS = [
  {
    quote: 'Saved me hours weekly on bookings – 5 stars from this Toronto detailer.',
    author: 'Marcus T.',
    location: 'Toronto',
    avatar: null,
  },
  {
    quote: 'My clients love the branded page. Bookings doubled in the first month.',
    author: 'Sarah L.',
    location: 'Vancouver',
    avatar: null,
  },
]
