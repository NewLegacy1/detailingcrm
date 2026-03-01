import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET() {
  const result = await requirePermission(PERMISSIONS.SETTINGS_VIEW)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()
  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const result = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
  if ('error' in result) return result.error

  const { auth } = result
  const supabase = await createClient()
  let orgId = auth.orgId
  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    orgId = org?.id ?? null
  }
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const body = await request.json()
  const upd: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (typeof body.invoice_due_days_default === 'number') upd.invoice_due_days_default = body.invoice_due_days_default
  if (typeof body.invoice_memo_default === 'string') upd.invoice_memo_default = body.invoice_memo_default
  if (typeof body.invoice_footer_default === 'string') upd.invoice_footer_default = body.invoice_footer_default
  if (typeof body.invoice_number_prefix === 'string') upd.invoice_number_prefix = body.invoice_number_prefix
  if (typeof body.invoice_tips_enabled === 'boolean') upd.invoice_tips_enabled = body.invoice_tips_enabled
  if (typeof body.tax_enabled === 'boolean') upd.tax_enabled = body.tax_enabled
  if (typeof body.tax_rate === 'number') upd.tax_rate = body.tax_rate
  if (typeof body.travel_fee_enabled === 'boolean') upd.travel_fee_enabled = body.travel_fee_enabled
  if (typeof body.travel_fee_amount === 'number') upd.travel_fee_amount = body.travel_fee_amount
  if (typeof body.fee_handling === 'string') upd.fee_handling = body.fee_handling
  if (Array.isArray(body.payment_methods)) upd.payment_methods = body.payment_methods
  if (typeof body.service_hours_start === 'number' && body.service_hours_start >= 0 && body.service_hours_start <= 23) upd.service_hours_start = body.service_hours_start
  if (typeof body.service_hours_end === 'number' && body.service_hours_end >= 1 && body.service_hours_end <= 24) upd.service_hours_end = body.service_hours_end
  if (typeof body.review_follow_up_days === 'number') upd.review_follow_up_days = body.review_follow_up_days
  if (typeof body.review_page_url === 'string') upd.review_page_url = body.review_page_url
  if (typeof body.gmb_redirect_url === 'string') upd.gmb_redirect_url = body.gmb_redirect_url
  if (typeof body.under_five_feedback_email === 'string') upd.under_five_feedback_email = body.under_five_feedback_email
  if (typeof body.new_booking_email_on === 'boolean') upd.new_booking_email_on = body.new_booking_email_on
  if (typeof body.new_booking_sms_on === 'boolean') upd.new_booking_sms_on = body.new_booking_sms_on
  if (typeof body.job_reminder_mins === 'number') upd.job_reminder_mins = body.job_reminder_mins
  if (typeof body.job_reminder_email_on === 'boolean') upd.job_reminder_email_on = body.job_reminder_email_on
  if (Array.isArray(body.maintenance_upsell_days)) upd.maintenance_upsell_days = body.maintenance_upsell_days
  if (typeof body.maintenance_detail_url === 'string') upd.maintenance_detail_url = body.maintenance_detail_url
  if (typeof body.maintenance_upsell_subject === 'string' || body.maintenance_upsell_subject === null) upd.maintenance_upsell_subject = body.maintenance_upsell_subject
  if (typeof body.maintenance_upsell_message === 'string' || body.maintenance_upsell_message === null) upd.maintenance_upsell_message = body.maintenance_upsell_message
  if (typeof body.maintenance_discount_type === 'string' && ['none', 'percent', 'fixed'].includes(body.maintenance_discount_type)) upd.maintenance_discount_type = body.maintenance_discount_type
  if (typeof body.maintenance_discount_value === 'number' && body.maintenance_discount_value >= 0) upd.maintenance_discount_value = body.maintenance_discount_value
  if (typeof body.new_booking_sms_message === 'string' || body.new_booking_sms_message === null) upd.new_booking_sms_message = body.new_booking_sms_message
  if (typeof body.new_booking_email_message === 'string' || body.new_booking_email_message === null) upd.new_booking_email_message = body.new_booking_email_message
  if (typeof body.job_reminder_sms_message === 'string' || body.job_reminder_sms_message === null) upd.job_reminder_sms_message = body.job_reminder_sms_message
  if (typeof body.review_request_message === 'string' || body.review_request_message === null) upd.review_request_message = body.review_request_message
  if (typeof body.review_request_subject === 'string' || body.review_request_subject === null) upd.review_request_subject = body.review_request_subject
  if (typeof body.job_reminder_subject === 'string' || body.job_reminder_subject === null) upd.job_reminder_subject = body.job_reminder_subject
  if (typeof body.timezone === 'string') upd.timezone = body.timezone
  if (typeof body.min_notice_minutes === 'number') upd.min_notice_minutes = body.min_notice_minutes
  if (typeof body.max_days_in_advance === 'number') upd.max_days_in_advance = body.max_days_in_advance
  if (typeof body.setup_buffer_minutes === 'number') upd.setup_buffer_minutes = body.setup_buffer_minutes
  if (typeof body.cleanup_buffer_minutes === 'number') upd.cleanup_buffer_minutes = body.cleanup_buffer_minutes
  if (typeof body.travel_buffer_minutes === 'number') upd.travel_buffer_minutes = body.travel_buffer_minutes
  if (typeof body.service_radius_km === 'number' || body.service_radius_km === null) upd.service_radius_km = body.service_radius_km
  if (body.business_hours !== undefined && (body.business_hours === null || typeof body.business_hours === 'object')) upd.business_hours = body.business_hours
  if (Array.isArray(body.blackout_dates)) upd.blackout_dates = body.blackout_dates
  if (body.blackout_ranges !== undefined) upd.blackout_ranges = body.blackout_ranges
  if (typeof body.logo_url === 'string' || body.logo_url === null) upd.logo_url = body.logo_url
  if (typeof body.crm_accent_color === 'string' || body.crm_accent_color === null) upd.crm_accent_color = body.crm_accent_color
  if (typeof body.crm_bg_color === 'string' || body.crm_bg_color === null) upd.crm_bg_color = body.crm_bg_color
  if (typeof body.crm_text_color === 'string' || body.crm_text_color === null) upd.crm_text_color = body.crm_text_color
  if (typeof body.booking_text_color === 'string' || body.booking_text_color === null) upd.booking_text_color = body.booking_text_color
  if (typeof body.crm_surface_color === 'string' || body.crm_surface_color === null) upd.crm_surface_color = body.crm_surface_color
  if (typeof body.primary_color === 'string' || body.primary_color === null) upd.primary_color = body.primary_color
  if (typeof body.secondary_color === 'string' || body.secondary_color === null) upd.secondary_color = body.secondary_color
  if (typeof body.accent_color === 'string' || body.accent_color === null) upd.accent_color = body.accent_color
  if (typeof body.theme === 'string') upd.theme = body.theme
  if (typeof body.map_theme === 'string') upd.map_theme = body.map_theme
  if (typeof body.booking_slug === 'string') {
    const normalized = body.booking_slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (normalized) upd.booking_slug = normalized
  }
  if (typeof body.booking_domain === 'string' || body.booking_domain === null) upd.booking_domain = body.booking_domain?.trim() || null
  if (body.map_lat !== undefined) {
    if (body.map_lat === null) upd.map_lat = null
    else if (typeof body.map_lat === 'number' && !Number.isNaN(body.map_lat)) upd.map_lat = body.map_lat
    else if (typeof body.map_lat === 'string') { const n = parseFloat(body.map_lat); if (!Number.isNaN(n)) upd.map_lat = n }
  }
  if (body.map_lng !== undefined) {
    if (body.map_lng === null) upd.map_lng = null
    else if (typeof body.map_lng === 'number' && !Number.isNaN(body.map_lng)) upd.map_lng = body.map_lng
    else if (typeof body.map_lng === 'string') { const n = parseFloat(body.map_lng); if (!Number.isNaN(n)) upd.map_lng = n }
  }
  if (typeof body.booking_display_name === 'string' || body.booking_display_name === null) upd.booking_display_name = body.booking_display_name
  if (typeof body.booking_tagline === 'string' || body.booking_tagline === null) upd.booking_tagline = body.booking_tagline
  if (typeof body.booking_show_prices === 'boolean') upd.booking_show_prices = body.booking_show_prices
  if (typeof body.name === 'string' || body.name === null) upd.name = body.name?.trim() || null
  if (typeof body.team_size_range === 'string' || body.team_size_range === null) upd.team_size_range = body.team_size_range?.trim() || null
  if (body.onboarding_feature_preferences !== undefined && (body.onboarding_feature_preferences === null || typeof body.onboarding_feature_preferences === 'object')) upd.onboarding_feature_preferences = body.onboarding_feature_preferences
  if (typeof body.website === 'string' || body.website === null) upd.website = body.website?.trim() || null
  // Automation toggles and granular settings
  if (typeof body.review_follow_up_enabled === 'boolean') upd.review_follow_up_enabled = body.review_follow_up_enabled
  if (typeof body.new_booking_notification_enabled === 'boolean') upd.new_booking_notification_enabled = body.new_booking_notification_enabled
  if (typeof body.job_reminder_enabled === 'boolean') upd.job_reminder_enabled = body.job_reminder_enabled
  if (typeof body.maintenance_upsell_enabled === 'boolean') upd.maintenance_upsell_enabled = body.maintenance_upsell_enabled
  if (typeof body.review_follow_up_hours === 'number') upd.review_follow_up_hours = body.review_follow_up_hours
  if (typeof body.new_booking_client_email_on === 'boolean') upd.new_booking_client_email_on = body.new_booking_client_email_on
  if (typeof body.new_booking_client_sms_on === 'boolean') upd.new_booking_client_sms_on = body.new_booking_client_sms_on
  if (typeof body.new_booking_user_email_on === 'boolean') upd.new_booking_user_email_on = body.new_booking_user_email_on
  if (typeof body.new_booking_user_sms_on === 'boolean') upd.new_booking_user_sms_on = body.new_booking_user_sms_on
  if (typeof body.job_reminder_client_email_on === 'boolean') upd.job_reminder_client_email_on = body.job_reminder_client_email_on
  if (typeof body.job_reminder_client_sms_on === 'boolean') upd.job_reminder_client_sms_on = body.job_reminder_client_sms_on
  if (typeof body.job_reminder_user_email_on === 'boolean') upd.job_reminder_user_email_on = body.job_reminder_user_email_on
  if (typeof body.job_reminder_user_sms_on === 'boolean') upd.job_reminder_user_sms_on = body.job_reminder_user_sms_on
  if (typeof body.follow_up_hours === 'number') upd.follow_up_hours = body.follow_up_hours
  if (typeof body.abandoned_cart_enabled === 'boolean') upd.abandoned_cart_enabled = body.abandoned_cart_enabled
  if (typeof body.abandoned_cart_hours === 'number') upd.abandoned_cart_hours = body.abandoned_cart_hours
  if (typeof body.booking_payment_mode === 'string' && ['none', 'deposit', 'card_on_file'].includes(body.booking_payment_mode)) {
    upd.booking_payment_mode = body.booking_payment_mode
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_plan')
    .eq('id', orgId)
    .single()
  if (org?.subscription_plan === 'starter') {
    delete upd.logo_url
    delete upd.crm_accent_color
    delete upd.crm_bg_color
    delete upd.crm_text_color
    delete upd.booking_text_color
    delete upd.crm_surface_color
    delete upd.primary_color
    delete upd.secondary_color
    delete upd.accent_color
  }

  const { data: updated, error } = await supabase
    .from('organizations')
    .update(upd)
    .eq('id', orgId)
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'Organization not found or update not allowed' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
