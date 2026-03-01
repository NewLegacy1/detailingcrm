import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { BookingPageClient } from '@/components/booking/BookingPageClient'

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
  mapLat: number | null
  mapLng: number | null
  showPrices: boolean
  primaryColor?: string | null
  accentColor?: string | null
  theme?: string | null
  mapTheme?: string | null
  bookingTextColor?: string | null
  timezone: string
  serviceHoursStart: number
  serviceHoursEnd: number
  bookingSlotIntervalMinutes: number
  blackoutDates: string[]
  /** Pro only; 'none' | 'deposit' | 'card_on_file'. When not 'none', customer pays deposit or saves card at checkout. */
  bookingPaymentMode?: 'none' | 'deposit' | 'card_on_file'
  services: {
    id: string
    name: string
    duration_mins: number
    base_price: number
    description: string | null
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

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) notFound()

  const supabase = await createClient()

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
      mapLat: r.mapLat != null && !Number.isNaN(Number(r.mapLat)) ? Number(r.mapLat) : null,
      mapLng: r.mapLng != null && !Number.isNaN(Number(r.mapLng)) ? Number(r.mapLng) : null,
      showPrices: r.showPrices !== false,
      primaryColor: (r.primaryColor ?? r.primary_color ?? null) as string | null | undefined,
      accentColor: (r.accentColor ?? r.accent_color ?? null) as string | null | undefined,
      theme: (r.theme ?? null) as string | null | undefined,
      mapTheme: (r.mapTheme ?? r.map_theme ?? null) as string | null | undefined,
      bookingTextColor: (r.bookingTextColor ?? r.booking_text_color ?? null) as string | null | undefined,
      timezone: typeof r.timezone === 'string' ? r.timezone : 'America/Toronto',
      serviceHoursStart: typeof r.serviceHoursStart === 'number' ? r.serviceHoursStart : 9,
      serviceHoursEnd: typeof r.serviceHoursEnd === 'number' ? r.serviceHoursEnd : 18,
      bookingSlotIntervalMinutes: typeof r.bookingSlotIntervalMinutes === 'number' ? r.bookingSlotIntervalMinutes : 30,
      blackoutDates: Array.isArray(r.blackoutDates) ? (r.blackoutDates as string[]) : [],
      bookingPaymentMode: (r.bookingPaymentMode === 'deposit' || r.bookingPaymentMode === 'card_on_file') ? r.bookingPaymentMode : 'none',
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
    const orgRes = await supabase
      .from('organizations')
      .select('id, name, logo_url, booking_tagline, map_lat, map_lng, booking_show_prices, primary_color, accent_color, theme, map_theme, booking_text_color')
      .eq('booking_slug', normalizedSlug)
      .single()
    const org = orgRes.data
    if (orgRes.error || !org) notFound()

    const [profileRes, servicesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('business_name, avatar_url')
        .eq('org_id', org.id)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('services')
        .select('id, name, duration_mins, base_price, description, photo_urls')
        .eq('org_id', org.id)
        .order('name', { ascending: true }),
    ])
    const ownerProfile = profileRes.data
    const services = servicesRes.data ?? []
    context = {
      businessName: (ownerProfile?.business_name ?? org.name ?? 'Book').trim(),
      logoUrl: org.logo_url ?? ownerProfile?.avatar_url ?? null,
      tagline: org.booking_tagline ?? null,
      mapLat: org.map_lat != null ? Number(org.map_lat) : null,
      mapLng: org.map_lng != null ? Number(org.map_lng) : null,
      showPrices: org.booking_show_prices !== false,
      primaryColor: org.primary_color ?? null,
      accentColor: org.accent_color ?? null,
      theme: org.theme ?? null,
      mapTheme: (org as Record<string, unknown>).map_theme as string ?? null,
      bookingTextColor: (org as Record<string, unknown>).booking_text_color as string ?? null,
      timezone: 'America/Toronto',
      serviceHoursStart: 9,
      serviceHoursEnd: 18,
      bookingSlotIntervalMinutes: 30,
      blackoutDates: [],
      bookingPaymentMode: 'none',
      services: services.map((s) => {
        const raw = s.photo_urls
        const photoUrls = Array.isArray(raw) ? raw.filter((u): u is string => typeof u === 'string' && u.length > 0) : []
        return {
          id: s.id,
          name: s.name,
          duration_mins: s.duration_mins,
          base_price: Number(s.base_price),
          description: s.description ?? null,
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
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('id, maintenance_discount_type, maintenance_discount_value')
      .eq('booking_slug', normalizedSlug)
      .single()
    if (orgRow?.id) {
      const { data: jobRow } = await supabase
        .from('jobs')
        .select('id, service_id')
        .eq('id', jobIdStr)
        .eq('org_id', orgRow.id)
        .single()
      if (jobRow?.service_id) {
        const { data: serviceRow } = await supabase.from('services').select('name').eq('id', jobRow.service_id).single()
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

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#212121] text-white">Loading…</div>}>
      <BookingPageClient slug={slug} context={context} maintenanceContext={maintenanceContext} />
    </Suspense>
  )
}
