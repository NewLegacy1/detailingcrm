import { Suspense } from 'react'
import { BookingPageClient } from '@/components/booking/BookingPageClient'
import type { BookingContext } from '@/app/book/[slug]/page'

const DEFAULT_BUSINESS = 'Apex Auto Detailing'

const createDemoContext = (businessName: string): BookingContext => ({
  businessName,
  logoUrl: null,
  tagline: 'Premium mobile detailing — we come to you.',
  mapLat: 43.6532,
  mapLng: -79.3832,
  showPrices: true,
  primaryColor: '#00b8f5',
  accentColor: '#00b8f5',
  theme: 'dark',
  mapTheme: 'dark',
  timezone: 'America/Toronto',
  serviceHoursStart: 8,
  serviceHoursEnd: 18,
  bookingSlotIntervalMinutes: 60,
  blackoutDates: [],
  services: [
    {
      id: 'demo-1',
      name: 'Full Detail',
      duration_mins: 240,
      base_price: 200,
      description: 'Complete interior + exterior detail. Paint decontamination, hand wax, full vacuum, leather conditioning, and window clean.',
      size_prices: [
        { size_key: 'sedan',   label: 'Sedan',   price_offset: 0   },
        { size_key: 'suv',     label: 'SUV',     price_offset: 40  },
        { size_key: 'truck',   label: 'Truck',   price_offset: 50  },
        { size_key: 'van',     label: 'Van',     price_offset: 60  },
      ],
    },
    {
      id: 'demo-2',
      name: 'Interior Detail',
      duration_mins: 150,
      base_price: 130,
      description: 'Deep clean of all interior surfaces. Full vacuum, shampooing, stain removal, dashboard wipe-down, and window interiors.',
      size_prices: [
        { size_key: 'sedan', label: 'Sedan', price_offset: 0  },
        { size_key: 'suv',   label: 'SUV',   price_offset: 30 },
        { size_key: 'truck', label: 'Truck', price_offset: 35 },
      ],
    },
    {
      id: 'demo-3',
      name: 'Exterior Wash & Wax',
      duration_mins: 90,
      base_price: 90,
      description: 'Hand wash, clay bar, spray wax, tire shine, and window clean — brings out the shine without the full detail price.',
      size_prices: [
        { size_key: 'sedan', label: 'Sedan', price_offset: 0  },
        { size_key: 'suv',   label: 'SUV',   price_offset: 20 },
        { size_key: 'truck', label: 'Truck', price_offset: 25 },
      ],
    },
    {
      id: 'demo-4',
      name: 'Paint Correction',
      duration_mins: 360,
      base_price: 450,
      description: 'Single-stage machine polish to remove swirl marks, light scratches, and oxidation. Results in a mirror-like finish.',
      size_prices: [
        { size_key: 'sedan', label: 'Sedan', price_offset: 0    },
        { size_key: 'suv',   label: 'SUV',   price_offset: 100  },
        { size_key: 'truck', label: 'Truck', price_offset: 125  },
      ],
    },
  ],
  upsells: [
    { id: 'u1', name: 'Ceramic Coating (1-year)',  price: 299, category: 'Protection' },
    { id: 'u2', name: 'Odour Elimination',          price: 60,  category: 'Interior'   },
    { id: 'u3', name: 'Engine Bay Clean',           price: 75,  category: 'Exterior'   },
    { id: 'u4', name: 'Headlight Restoration',      price: 80,  category: 'Exterior'   },
  ],
})

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const params = await searchParams
  const business = params?.business?.trim()
  const title = business ? `${decodeURIComponent(business)} — Book Online` : 'Apex Auto Detailing — Book Online'
  return {
    title,
    description: 'Demo booking page powered by DetailOps.',
  }
}

export default async function DemoBookingPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const params = await searchParams
  const business = params?.business?.trim()
  const businessName = business ? decodeURIComponent(business) : DEFAULT_BUSINESS
  const context = createDemoContext(businessName)

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#212121] text-white">Loading…</div>}>
      <BookingPageClient slug="demo" context={context} />
    </Suspense>
  )
}
