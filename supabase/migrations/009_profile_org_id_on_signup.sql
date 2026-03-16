-- Ensure new signups get org_id and backfill existing profiles with no org

-- 1. Backfill: assign default org to any profile that has no org_id
update public.profiles
set org_id = (select id from public.organizations order by created_at asc limit 1)
where org_id is null;

-- 2. Trigger: set org_id when creating a new profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_org_id uuid;
begin
  select id into default_org_id from public.organizations order by created_at asc limit 1;
  insert into public.profiles (id, role, display_name, business_name, org_id)
  values (
    new.id,
    'pending',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'business_name',
    default_org_id
  );
  return new;
end;
$$ language plpgsql security definer;
