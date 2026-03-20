import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { BookingPageClient } from '@/components/booking/BookingPageClient'
import { BookingPageClientMultiLocation } from '@/components/booking/BookingPageClientMultiLocation'

export interface BookingUpsell {
  id: string
  name: string
  price: number
  category: string
  icon_url?: string | null
  service_ids?: string[] | null
}

export interface BookingContext {
  businessName: string
  logoUrl: string | null
  tagline: string | null
  /** City or area name for header review line (e.g. "Hamilton"). From org.booking_service_area_label. */
  serviceAreaLabel?: string | null
  mapLat: number | null
  mapLng: number | null
  /** When set, booking is only allowed when address is within this many km of map center. */
  serviceRadiusKm?: number | null
  showPrices: boolean
  primaryColor?: string | null
  accentColor?: string | null
  theme?: string | null
  mapTheme?: string | null
  bookingTextColor?: string | null
  bookingHeaderTextColor?: string | null
  timezone: string
  serviceHoursStart: number
  serviceHoursEnd: number
  bookingSlotIntervalMinutes: number
  blackoutDates: string[]
  /** Pro only; 'none' | 'deposit' | 'card_on_file'. When not 'none', customer pays deposit or saves card at checkout. */
  bookingPaymentMode?: 'none' | 'deposit' | 'card_on_file'
  /** Pro only; 'mobile' | 'shop' | 'both'. When 'both', customer can choose shop or their address. */
  serviceMode?: 'mobile' | 'shop' | 'both'
  /** Shop address when serviceMode is 'shop' or 'both'. */
  shopAddress?: string | null
  /** Organization business website from onboarding (organizations.website). Used for "Back to [name]" link in booking menu. */
  website?: string | null
  services: {
    id: string
    name: string
    duration_mins: number
    base_price: number
    description: string | null
    category?: string | null
    category_sort_order?: number | null
    sort_order?: number
    photo_urls?: string[]
    size_prices: { size_key: string; label: string; price_offset: number }[]
  }[]
  upsells: BookingUpsell[]
}

export interface MaintenanceContext {
  serviceId: string
  serviceName: string
  /** When customer comes from maintenance link and org has a discount configured. */
  discount?: { type: 'percent' | 'fixed'; value: number }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) return { title: 'Booking' }
  const supabase = await createClient()
  const serviceSupabase = await createServiceRoleClient()
  const { data: raw } = await supabase.rpc('get_public_booking_context', { p_slug: normalizedSlug })
  let businessName = 'Booking'
  if (raw != null && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    businessName = String((r.businessName ?? r.business_name ?? 'Booking')).trim() || 'Booking'
  }
  if (businessName === 'Booking') {
    const { data: org } = await serviceSupabase
      .from('organizations')
      .select('name')
      .eq('booking_slug', normalizedSlug)
      .single()
    if (org?.name) businessName = String(org.name).trim() || businessName
  }
  return {
    title: `Booking - ${businessName}`,
    icons: { icon: '/api/icon?v=5' },
  }
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) notFound()

  const supabase = await createClient()
  const serviceSupabase = await createServiceRoleClient()

  let context: BookingContext | null = null

  const { data: raw, error: rpcError } = await supabase.rpc('get_public_booking_context', {
    p_slug: normalizedSlug,
  })

  if (!rpcError && raw != null && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    const rawServices = r.services ?? (r as Record<string, unknown>).Services ?? []
    const servicesArray = Array.isArray(rawServices) ? rawServices : []
    const rawSizes = (s: Record<string, unknown>) => {
      const sp = s.size_prices ?? s.sizePrices
      if (Array.isArray(sp)) return sp as Record<string, unknown>[]
      return []
    }
    context = {
      businessName: String((r.businessName ?? 'Book')).trim(),
      logoUrl: (r.logoUrl ?? r.logo_url ?? null) as string | null,
      tagline: (r.tagline ?? null) as string | null,
      serviceAreaLabel: (r.serviceAreaLabel ?? r.service_area_label ?? null) as string | null | undefined,
      mapLat: r.mapLat != null && !Number.isNaN(Number(r.mapLat)) ? Number(r.mapLat) : null,
      mapLng: r.mapLng != null && !Number.isNaN(Number(r.mapLng)) ? Number(r.mapLng) : null,
      serviceRadiusKm: r.serviceRadiusKm != null && !Number.isNaN(Number(r.serviceRadiusKm)) ? Number(r.serviceRadiusKm) : null,
      showPrices: r.showPrices !== false,
      primaryColor: (r.primaryColor ?? r.primary_color ?? null) as string | null | undefined,
      accentColor: (r.accentColor ?? r.accent_color ?? null) as string | null | undefined,
      theme: (r.theme ?? null) as string | null | undefined,
      mapTheme: (r.mapTheme ?? r.map_theme ?? null) as string | null | undefined,
      bookingTextColor: (r.bookingTextColor ?? r.booking_text_color ?? null) as string | null | undefined,
      bookingHeaderTextColor: (r.bookingHeaderTextColor ?? r.booking_header_text_color ?? null) as string | null | undefined,
      timezone: typeof r.timezone === 'string' ? r.timezone : 'America/Toronto',
      serviceHoursStart: typeof r.serviceHoursStart === 'number' ? r.serviceHoursStart : 9,
      serviceHoursEnd: typeof r.serviceHoursEnd === 'number' ? r.serviceHoursEnd : 18,
      bookingSlotIntervalMinutes: typeof r.bookingSlotIntervalMinutes === 'number' ? r.bookingSlotIntervalMinutes : 30,
      blackoutDates: Array.isArray(r.blackoutDates) ? (r.blackoutDates as string[]) : [],
      bookingPaymentMode: (r.bookingPaymentMode === 'deposit' || r.bookingPaymentMode === 'card_on_file') ? r.bookingPaymentMode : 'none',
      serviceMode: (r.serviceMode === 'shop' || r.serviceMode === 'both') ? r.serviceMode : 'mobile',
      shopAddress: (r.shopAddress ?? null) as string | null | undefined,
      website: (r.website ?? null) as string | null | undefined,
      services: servicesArray.map((s: Record<string, unknown>) => {
        const rawPhotos = s.photo_urls ?? s.photoUrls
        const photoUrls = Array.isArray(rawPhotos)
          ? (rawPhotos as unknown[]).filter((u): u is string => typeof u === 'string' && u.length > 0)
          : []
        return {
          id: String(s.id ?? ''),
          name: String(s.name ?? ''),
          duration_mins: Number(s.duration_mins ?? s.durationMins ?? 0),
          base_price: Number(s.base_price ?? s.basePrice ?? 0),
          description: s.description != null ? String(s.description) : null,
          category: s.category != null ? String(s.category) : null,
          category_sort_order: s.category_sort_order != null ? Number(s.category_sort_order) : s.categorySortOrder != null ? Number(s.categorySortOrder) : null,
          sort_order: s.sort_order != null ? Number(s.sort_order) : 0,
          photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
          size_prices: rawSizes(s).map((sp: Record<string, unknown>) => ({
            size_key: String(sp.size_key ?? sp.sizeKey ?? ''),
            label: String(sp.label ?? ''),
            price_offset: Number(sp.price_offset ?? sp.priceOffset ?? 0),
          })),
        }
      }),
      upsells: parseUpsells(r.upsells),
    }
  }

  function parseUpsells(raw: unknown): BookingUpsell[] {
    if (!Array.isArray(raw)) return []
    return raw.map((u: Record<string, unknown>) => ({
      id: String(u.id ?? ''),
      name: String(u.name ?? ''),
      price: Number(u.price ?? 0),
      category: String(u.category ?? ''),
      icon_url: (u.icon_url ?? null) as string | null | undefined,
      service_ids: Array.isArray(u.service_ids) ? (u.service_ids as string[]) : null,
    }))
  }

  if (!context) {
    const orgRes = await serviceSupabase
      .from('organizations')
      .select('id, name, logo_url, booking_tagline, booking_service_area_label, map_lat, map_lng, service_radius_km, booking_show_prices, primary_color, accent_color, theme, map_theme, booking_text_color, booking_header_text_color, website')
      .eq('booking_slug', normalizedSlug)
      .single()
    const org = orgRes.data
    if (orgRes.error || !org) notFound()

    const [profileRes, servicesRes] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('business_name, avatar_url')
        .eq('org_id', org.id)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle(),
      serviceSupabase
        .from('services')
        .select('id, name, duration_mins, base_price, description, category_id, sort_order, photo_urls, service_categories(name, sort_order)')
        .eq('org_id', org.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ])
    const ownerProfile = profileRes.data
    const services = servicesRes.data ?? []
    context = {
      businessName: (ownerProfile?.business_name ?? org.name ?? 'Book').trim(),
      logoUrl: org.logo_url ?? ownerProfile?.avatar_url ?? null,
      tagline: org.booking_tagline ?? null,
      serviceAreaLabel: (org as Record<string, unknown>).booking_service_area_label as string ?? null,
      mapLat: org.map_lat != null ? Number(org.map_lat) : null,
      mapLng: org.map_lng != null ? Number(org.map_lng) : null,
      serviceRadiusKm: (org as Record<string, unknown>).service_radius_km != null ? Number((org as Record<string, unknown>).service_radius_km) : null,
      showPrices: org.booking_show_prices !== false,
      primaryColor: org.primary_color ?? null,
      accentColor: org.accent_color ?? null,
      theme: org.theme ?? null,
      mapTheme: (org as Record<string, unknown>).map_theme as string ?? null,
      bookingTextColor: (org as Record<string, unknown>).booking_text_color as string ?? null,
      bookingHeaderTextColor: (org as Record<string, unknown>).booking_header_text_color as string ?? null,
      timezone: 'America/Toronto',
      serviceHoursStart: 9,
      serviceHoursEnd: 18,
      bookingSlotIntervalMinutes: 30,
      blackoutDates: [],
      bookingPaymentMode: 'none',
      serviceMode: 'mobile',
      shopAddress: null,
      website: (org as Record<string, unknown>).website as string ?? null,
      services: services.map((s) => {
        const raw = s.photo_urls
        const photoUrls = Array.isArray(raw) ? raw.filter((u): u is string => typeof u === 'string' && u.length > 0) : []
        const row = s as Record<string, unknown>
        const sc = row.service_categories as { name?: string; sort_order?: number } | null
        return {
          id: s.id,
          name: s.name,
          duration_mins: s.duration_mins,
          base_price: Number(s.base_price),
          description: s.description ?? null,
          category: sc?.name ?? null,
          sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
          photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
          size_prices: [],
        }
      }),
      upsells: [],
    }
  }

  let maintenanceContext: MaintenanceContext | null = null
  const ref = resolvedSearchParams.ref
  const jobParam = resolvedSearchParams.job
  const jobIdStr = typeof jobParam === 'string' ? jobParam.trim() : Array.isArray(jobParam) ? String(jobParam[0] ?? '').trim() : ''
  if (ref === 'maintenance' && jobIdStr && context) {
    const { data: orgRow } = await serviceSupabase
      .from('organizations')
      .select('id, maintenance_discount_type, maintenance_discount_value')
      .eq('booking_slug', normalizedSlug)
      .single()
    if (orgRow?.id) {
      const { data: jobRow } = await serviceSupabase
        .from('jobs')
        .select('id, service_id')
        .eq('id', jobIdStr)
        .eq('org_id', orgRow.id)
        .single()
      if (jobRow?.service_id) {
        const { data: serviceRow } = await serviceSupabase.from('services').select('name').eq('id', jobRow.service_id).single()
        if (serviceRow?.name) {
          const discountType = orgRow.maintenance_discount_type
          const discountValue = Number(orgRow.maintenance_discount_value) || 0
          const hasDiscount = (discountType === 'percent' || discountType === 'fixed') && discountValue > 0
          maintenanceContext = {
            serviceId: jobRow.service_id,
            serviceName: serviceRow.name,
            ...(hasDiscount && { discount: { type: discountType as 'percent' | 'fixed', value: discountValue } }),
          }
        }
      }
    }
  }

  // Multi-location (Pro only): show location step when enabled and more than one location
  let useMultiLocation = false
  let locationsForStep: { id: string; name: string; address?: string | null; distance_km?: number | null; next_available?: string | null }[] = []
  const { data: orgFlags } = await serviceSupabase
    .from('organizations')
    .select('id, subscription_plan, multi_location_enabled')
    .eq('booking_slug', normalizedSlug)
    .single()
  if (orgFlags?.subscription_plan === 'pro' && orgFlags?.multi_location_enabled === true) {
    const { data: locRows } = await supabase.rpc('get_public_booking_locations', {
      p_slug: normalizedSlug,
      p_lat: null,
      p_lng: null,
    })
    const locList = Array.isArray(locRows) ? locRows : []
    if (locList.length > 1) {
      useMultiLocation = true
      locationsForStep = locList.map((l: Record<string, unknown>) => ({
        id: String(l.id ?? ''),
        name: String(l.name ?? ''),
        address: l.address != null ? String(l.address) : null,
        timezone: l.timezone != null ? String(l.timezone) : null,
        distance_km: l.distance_km != null ? Number(l.distance_km) : null,
        next_available: null,
      }))
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#212121] text-white">Loading…</div>}>
      {useMultiLocation ? (
        <BookingPageClientMultiLocation
          slug={slug}
          initialContext={context}
          locations={locationsForStep}
          maintenanceContext={maintenanceContext}
        />
      ) : (
        <BookingPageClient slug={slug} context={context} maintenanceContext={maintenanceContext} />
      )}
    </Suspense>
  )
}
