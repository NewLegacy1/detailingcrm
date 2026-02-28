-- When set, user has finished the post-signup onboarding and can use the CRM.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.onboarding_completed_at is 'Set when user completes the post-signup onboarding flow; null means redirect to /onboarding/setup';

-- Existing users are considered already onboarded.
update public.profiles
set onboarding_completed_at = coalesce(updated_at, created_at)
where onboarding_completed_at is null;
