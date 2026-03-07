/**
 * Multi-location booking (Pro only). See plan: locations, location_services.
 */

export interface Location {
  id: string
  org_id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  /** Service area radius in km (from map picker). Null = use org default. */
  service_radius_km: number | null
  timezone: string | null
  service_mode: 'mobile' | 'shop' | 'both'
  hours_start: number
  hours_end: number
  slot_interval_minutes: number
  blackout_dates: string[]
  blackout_ranges: Array<{ start: string; end: string }> | null
  sort_order: number
  is_active: boolean
  booking_promo_code_prefix: string | null
  created_at: string
  updated_at: string
}

export interface LocationService {
  id: string
  location_id: string
  service_id: string
  is_offered: boolean
  price_override: number | null
  created_at: string
  updated_at: string
}

/** Location with optional distance (from geo API) and next slot summary */
export interface LocationWithMeta extends Location {
  distance_km?: number | null
  next_available?: string | null
}
