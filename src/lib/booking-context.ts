import type { BookingContext, BookingUpsell } from '@/app/book/[slug]/page'

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

/**
 * Normalizes raw RPC response (get_public_booking_context or get_public_booking_context_for_location)
 * to BookingContext shape. Used by API route and client.
 */
export function normalizePublicBookingContext(raw: unknown): BookingContext {
  const r = (raw != null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rawServices = r.services ?? (r as Record<string, unknown>).Services ?? []
  const servicesArray = Array.isArray(rawServices) ? rawServices : []
  const rawSizes = (s: Record<string, unknown>) => {
    const sp = s.size_prices ?? s.sizePrices
    if (Array.isArray(sp)) return sp as Record<string, unknown>[]
    return []
  }
  return {
    businessName: String((r.businessName ?? r.business_name ?? 'Book')).trim(),
    logoUrl: (r.logoUrl ?? r.logo_url ?? null) as string | null,
    tagline: (r.tagline ?? null) as string | null,
    serviceAreaLabel: (r.serviceAreaLabel ?? r.service_area_label ?? null) as string | null | undefined,
    mapLat: r.mapLat != null && !Number.isNaN(Number(r.mapLat)) ? Number(r.mapLat) : (r.map_lat != null && !Number.isNaN(Number(r.map_lat)) ? Number(r.map_lat) : null),
    mapLng: r.mapLng != null && !Number.isNaN(Number(r.mapLng)) ? Number(r.mapLng) : (r.map_lng != null && !Number.isNaN(Number(r.map_lng)) ? Number(r.map_lng) : null),
    serviceRadiusKm: r.serviceRadiusKm != null && !Number.isNaN(Number(r.serviceRadiusKm)) ? Number(r.serviceRadiusKm) : (r.service_radius_km != null && !Number.isNaN(Number(r.service_radius_km)) ? Number(r.service_radius_km) : null),
    showPrices: r.showPrices !== false && r.show_prices !== false,
    primaryColor: (r.primaryColor ?? r.primary_color ?? null) as string | null | undefined,
    accentColor: (r.accentColor ?? r.accent_color ?? null) as string | null | undefined,
    theme: (r.theme ?? null) as string | null | undefined,
    mapTheme: (r.mapTheme ?? r.map_theme ?? null) as string | null | undefined,
    bookingTextColor: (r.bookingTextColor ?? r.booking_text_color ?? null) as string | null | undefined,
    bookingHeaderTextColor: (r.bookingHeaderTextColor ?? r.booking_header_text_color ?? null) as string | null | undefined,
    timezone: typeof r.timezone === 'string' ? r.timezone : 'America/Toronto',
    serviceHoursStart: typeof r.serviceHoursStart === 'number' ? r.serviceHoursStart : (typeof (r as Record<string, unknown>).service_hours_start === 'number' ? (r as Record<string, unknown>).service_hours_start as number : 9),
    serviceHoursEnd: typeof r.serviceHoursEnd === 'number' ? r.serviceHoursEnd : (typeof (r as Record<string, unknown>).service_hours_end === 'number' ? (r as Record<string, unknown>).service_hours_end as number : 18),
    bookingSlotIntervalMinutes: typeof r.bookingSlotIntervalMinutes === 'number' ? r.bookingSlotIntervalMinutes : (typeof (r as Record<string, unknown>).booking_slot_interval_minutes === 'number' ? (r as Record<string, unknown>).booking_slot_interval_minutes as number : 30),
    blackoutDates: Array.isArray(r.blackoutDates) ? (r.blackoutDates as string[]) : (Array.isArray(r.blackout_dates) ? (r.blackout_dates as string[]) : []),
    bookingPaymentMode: (r.bookingPaymentMode === 'deposit' || r.bookingPaymentMode === 'card_on_file') ? r.bookingPaymentMode : ((r as Record<string, unknown>).booking_payment_mode === 'deposit' || (r as Record<string, unknown>).booking_payment_mode === 'card_on_file') ? (r as Record<string, unknown>).booking_payment_mode as 'deposit' | 'card_on_file' : 'none',
    serviceMode: (r.serviceMode === 'shop' || r.serviceMode === 'both') ? r.serviceMode : ((r as Record<string, unknown>).service_mode === 'shop' || (r as Record<string, unknown>).service_mode === 'both') ? (r as Record<string, unknown>).service_mode as 'mobile' | 'shop' | 'both' : 'mobile',
    shopAddress: (r.shopAddress ?? r.shop_address ?? null) as string | null | undefined,
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
