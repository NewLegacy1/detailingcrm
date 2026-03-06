import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePublicBookingContext } from '@/lib/booking-context'

/** GET /api/booking/booking-context?slug=xxx&locationId=xxx (locationId optional)
 * Returns full booking context (normalized BookingContext shape).
 * When locationId is present and valid, returns location-scoped context; otherwise org-level.
 * Anon-safe. Used by multi-location booking flow when user has selected a location.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() ?? ''
  const locationIdParam = req.nextUrl.searchParams.get('locationId') ?? req.nextUrl.searchParams.get('location_id') ?? ''
  const locationId = locationIdParam.trim() || null

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = await createClient()

  if (locationId) {
    const { data: raw } = await supabase.rpc('get_public_booking_context_for_location', {
      p_slug: slug,
      p_location_id: locationId,
    })
    if (raw == null) return NextResponse.json({ error: 'Invalid slug or location' }, { status: 404 })
    return NextResponse.json(normalizePublicBookingContext(raw))
  }

  const { data: raw } = await supabase.rpc('get_public_booking_context', { p_slug: slug })
  if (raw == null) return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 })
  return NextResponse.json(normalizePublicBookingContext(raw))
}
