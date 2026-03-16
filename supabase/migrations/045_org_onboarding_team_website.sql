-- Onboarding: team size, feature preferences, website on organizations

alter table public.organizations
  add column if not exists team_size_range text,
  add column if not exists onboarding_feature_preferences jsonb,
  add column if not exists website text;

comment on column public.organizations.team_size_range is 'e.g. just_me, 2_5, 6_10, 10_plus from onboarding';
comment on column public.organizations.onboarding_feature_preferences is 'e.g. { marketing: true, leads: true, payments: true }';
comment on column public.organizations.website is 'Organization website URL';
