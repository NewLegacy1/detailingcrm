import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingUpdatePasswordClient } from '@/components/booking/BookingUpdatePasswordClient'
import type { BookingProfilePageContext } from '@/components/booking/BookingProfileClient'

export default async function BookUpdatePasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) notFound()

  const supabase = await createClient()
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, logo_url, primary_color, accent_color, booking_header_text_color, booking_text_color')
    .eq('booking_slug', normalizedSlug)
    .single()

  if (error || !org) notFound()

  const { data: owner } = await supabase
    .from('profiles')
    .select('business_name, avatar_url')
    .eq('org_id', org.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  const context: BookingProfilePageContext = {
    slug: normalizedSlug,
    businessName: (owner?.business_name ?? org.name ?? 'Book').trim(),
    logoUrl: org.logo_url ?? owner?.avatar_url ?? null,
    primaryColor: (org as Record<string, unknown>).primary_color as string | null | undefined,
    accentColor: (org as Record<string, unknown>).accent_color as string | null | undefined,
    bookingHeaderTextColor: (org as Record<string, unknown>).booking_header_text_color as string | null | undefined,
    bookingTextColor: (org as Record<string, unknown>).booking_text_color as string | null | undefined,
  }

  return <BookingUpdatePasswordClient context={context} />
}
