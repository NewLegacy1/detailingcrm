-- Fix slug from business name: lowercase letters first so capitals are preserved as lowercase (not stripped)

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  business_name_text text;
  base_slug text;
  final_slug text;
begin
  business_name_text := coalesce(trim(new.raw_user_meta_data->>'business_name'), '');

  -- Clean to slug: lowercase first, then spaces to hyphens, strip other special chars (e.g. "ShowRoom AutoCare" -> "showroom-autocare")
  base_slug := regexp_replace(regexp_replace(lower(business_name_text), '\s+', '-', 'g'), '[^a-z0-9-]+', '', 'g');
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'org';
  end if;

  -- Ensure unique booking_slug
  final_slug := base_slug;
  while exists (select 1 from public.organizations where booking_slug = final_slug) loop
    final_slug := base_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end loop;

  -- Create organization for this user
  insert into public.organizations (id, name, booking_slug, updated_at)
  values (gen_random_uuid(), nullif(trim(business_name_text), ''), final_slug, now())
  returning id into new_org_id;

  -- Create profile linked to the new org
  insert into public.profiles (id, role, display_name, business_name, org_id)
  values (
    new.id,
    'owner',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    nullif(trim(business_name_text), ''),
    new_org_id
  );
  return new;
end;
$$ language plpgsql security definer;

comment on function public.handle_new_user is 'On signup: create org with booking_slug from cleaned business name (lowercase, hyphenated), create profile as owner.';
