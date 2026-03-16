-- Add business/company name to profiles and set from signup metadata

alter table public.profiles
  add column if not exists business_name text;

-- Update trigger to set business_name from raw_user_meta_data on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, display_name, business_name)
  values (
    new.id,
    'pending',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'business_name'
  );
  return new;
end;
$$ language plpgsql security definer;
