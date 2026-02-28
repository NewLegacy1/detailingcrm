-- Automation on/off toggles and granular notification settings

alter table public.organizations
  add column if not exists review_follow_up_enabled boolean default true,
  add column if not exists new_booking_notification_enabled boolean default true,
  add column if not exists job_reminder_enabled boolean default true,
  add column if not exists maintenance_upsell_enabled boolean default true,
  -- Split per-channel notifications
  add column if not exists new_booking_client_email_on boolean default true,
  add column if not exists new_booking_client_sms_on boolean default true,
  add column if not exists new_booking_user_email_on boolean default true,
  add column if not exists new_booking_user_sms_on boolean default true,
  add column if not exists job_reminder_client_email_on boolean default true,
  add column if not exists job_reminder_client_sms_on boolean default true,
  add column if not exists job_reminder_user_email_on boolean default true,
  add column if not exists job_reminder_user_sms_on boolean default true,
  -- Hours-based follow-ups (replaces days-only)
  add column if not exists review_follow_up_hours int default 24,
  add column if not exists follow_up_hours int default 48;
