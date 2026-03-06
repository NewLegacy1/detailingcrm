-- Automation message templates (default + custom with client variables)

alter table public.organizations
  add column if not exists new_booking_sms_message text,
  add column if not exists new_booking_email_message text,
  add column if not exists job_reminder_sms_message text,
  add column if not exists review_request_message text;
