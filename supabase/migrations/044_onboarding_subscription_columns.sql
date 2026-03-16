-- Original onboarding + subscription columns (paywall flow)
-- Profiles: onboarding progress and signup fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS sms_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'slug',
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Organizations: subscription (platform billing)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_subscription_plan_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_subscription_plan_check
      CHECK (subscription_plan IS NULL OR subscription_plan IN ('starter', 'pro'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current onboarding step for resume';
COMMENT ON COLUMN public.profiles.onboarding_complete IS 'True when user finished onboarding';
COMMENT ON COLUMN public.organizations.subscription_plan IS 'starter or pro';
COMMENT ON COLUMN public.organizations.subscription_status IS 'active, canceled, etc.';
