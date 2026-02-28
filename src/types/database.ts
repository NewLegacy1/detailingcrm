export type UserRole = 'pending' | 'owner' | 'admin' | 'manager' | 'technician'

export interface Organization {
  id: string
  name: string | null
  stripe_account_id: string | null
  stripe_email: string | null
  created_at: string
  updated_at: string
  booking_slug?: string
  booking_domain?: string | null
  map_lat?: number | null
  map_lng?: number | null
  timezone?: string
  booking_slot_interval_minutes?: number
  min_notice_minutes?: number
  max_days_in_advance?: number
  allow_same_day_bookings?: boolean
  setup_buffer_minutes?: number
  cleanup_buffer_minutes?: number
  travel_buffer_minutes?: number
  service_radius_km?: number | null
  auto_assign_at_booking?: boolean
  allow_unassigned_bookings?: boolean
  business_hours?: Record<string, { start: number; end: number }> | null
  blackout_dates?: string[] | null
  blackout_ranges?: Array<{ start: string; end: string }> | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  theme?: string | null
  booking_display_name?: string | null
  booking_tagline?: string | null
  booking_contact_phone?: string | null
  booking_contact_email?: string | null
  booking_service_area_label?: string | null
  booking_show_prices?: boolean
  booking_require_address_before_times?: boolean
  booking_require_deposit?: boolean
  booking_allow_quote_request?: boolean
  /** Pro only: 'none' | 'deposit' | 'card_on_file'. Turn on in Settings → Payments. */
  booking_payment_mode?: 'none' | 'deposit' | 'card_on_file' | null
  team_size_range?: string | null
  onboarding_feature_preferences?: Record<string, boolean> | null
  website?: string | null
  invoice_due_days_default?: number
  invoice_memo_default?: string | null
  invoice_footer_default?: string | null
  invoice_number_prefix?: string | null
  invoice_tips_enabled?: boolean
  tax_enabled?: boolean
  tax_rate?: number
  travel_fee_enabled?: boolean
  travel_fee_amount?: number
  fee_handling?: string | null
  payment_methods?: string[] | null
  google_company_calendar_id?: string | null
  google_tokens_encrypted?: string | null
  google_token_meta?: Record<string, unknown> | null
  google_sync_to_company?: boolean
  google_sync_to_employee?: boolean
  google_move_on_reassign?: boolean
}

export interface Role {
  id: string
  name: string
  key: string
  created_at: string
  updated_at: string
}

export interface RolePermission {
  role_id: string
  permission: string
}

export interface Profile {
  id: string
  role: UserRole
  role_id: string | null
  org_id: string | null
  display_name: string | null
  business_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  is_super_admin?: boolean
  onboarding_completed_at?: string | null
  google_calendar_id?: string | null
  google_tokens_encrypted?: string | null
  google_sync_enabled?: boolean
  product_tour_completed?: boolean | null
}

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  created_by: string
  created_at: string
  org_id?: string | null
  /** CASL: customer has consented to receive SMS from the business */
  sms_opt_in?: boolean | null
}

export interface Project {
  id: string
  client_id: string
  name: string
  status: string
  milestones: Record<string, unknown> | null
  owner_id: string | null
  created_at: string
}

export interface Lead {
  id: string
  client_id: string | null
  name: string
  email: string | null
  phone: string
  niche: string | null
  city: string | null
  website: string | null
  list_id: string | null
  status: 'new' | 'called' | 'no_answer' | 'didnt_book' | 'booked'
  cold_caller_id: string | null
  source: string | null
  created_at: string
}

export interface LeadList {
  id: string
  name: string
  niche: string | null
  total_count: number
  assigned_cold_callers: string[]
  created_at: string
}

export interface Deal {
  id: string
  client_id: string
  lead_id: string | null
  name: string
  value: number
  stage: string
  closer_id: string | null
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  lead_id: string | null
  client_id: string | null
  scheduled_at: string
  booked_by: string
  closer_id: string | null
  source: string
  notes: string | null
  created_at: string
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_amount: number
  amount: number
}

export interface Invoice {
  id: string
  client_id: string
  created_by: string
  job_id?: string | null
  stripe_invoice_id: string | null
  stripe_customer_id: string | null
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'void'
  currency: string
  amount_total: number
  amount_due: number | null
  due_date: string | null
  line_items: InvoiceLineItem[]
  memo: string | null
  footer: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  customer_id: string
  make: string
  model: string
  year: number | null
  color: string | null
  vin: string | null
  notes: string | null
  mileage: number | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  duration_mins: number
  base_price: number
  cost?: number
  description: string | null
  photo_urls?: string[] | null
  created_at: string
  updated_at: string
}

export type JobStatus = 'scheduled' | 'en_route' | 'in_progress' | 'done' | 'cancelled' | 'no_show'

export type GoogleSyncStatus = 'synced' | 'pending' | 'failed'

export interface Job {
  id: string
  customer_id: string
  vehicle_id: string | null
  service_id: string | null
  scheduled_at: string
  address: string
  assigned_tech_id: string | null
  status: JobStatus
  notes: string | null
  actual_started_at?: string | null
  actual_ended_at?: string | null
  created_at: string
  updated_at: string
  source?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  google_company_event_id?: string | null
  google_assigned_employee_event_id?: string | null
  google_sync_status?: GoogleSyncStatus | null
  google_last_synced_at?: string | null
  google_last_sync_error?: string | null
  paid_at?: string | null
}

export type JobPhotoType = 'before' | 'after'

export interface JobPhoto {
  id: string
  job_id: string
  url: string
  type: JobPhotoType
  caption: string | null
  created_at: string
}
