import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** GET /api/booking/context?slug=xxx
 * Public endpoint: returns org branding and review settings for the review page.
 * Used by /review/[slug] to show business name, logo, colors, and GMB redirect URL.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() ?? ''
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = await createServiceRoleClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      logo_url,
      primary_color,
      accent_color,
      gmb_redirect_url,
      under_five_feedback_email
    `)
    .eq('booking_slug', slug)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Invalid review link' }, { status: 404 })
  }

  // Get business name from owner profile if available
  const { data: owner } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('org_id', org.id)
    .eq('role', 'owner')
    .limit(1)
    .single()

  const businessName = (owner?.business_name ?? org.name ?? 'Us').trim() || 'Us'

  return NextResponse.json({
    businessName,
    logoUrl: org.logo_url ?? null,
    primaryColor: org.primary_color ?? null,
    accentColor: org.accent_color ?? null,
    gmbRedirectUrl: org.gmb_redirect_url ?? null,
    underFiveFeedbackEmail: org.under_five_feedback_email ?? null,
  })
}
