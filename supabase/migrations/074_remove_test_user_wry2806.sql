-- One-time: Remove auth user (and thus profile + booking_customer_accounts) for wry2806@gmail.com
-- so this email can be used again to test forgot-password / showrooms client sign-in.
-- Run once on production; safe no-op if user already missing.

-- 1. Delete auth user (cascades to public.profiles and public.booking_customer_accounts)
DELETE FROM auth.users
WHERE email = 'wry2806@gmail.com';

-- 2. Remove any organizations that no longer have any profiles (orphaned)
DELETE FROM public.organizations
WHERE id NOT IN (
  SELECT DISTINCT org_id FROM public.profiles WHERE org_id IS NOT NULL
);
