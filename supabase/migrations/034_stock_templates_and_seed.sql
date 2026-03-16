-- Stock service and add-on templates: orgs get these on signup and can add more from template in CRM.
-- Place images in public/images/stock/ and icons in public/images/icons/ (paths below).

-- 1. Service templates (no org_id; copied into services when org is created or "Add from template")
create table if not exists public.service_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_mins int not null default 60,
  base_price decimal(12,2) not null default 0,
  description text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Upsell templates (no org_id; copied into service_upsells)
create table if not exists public.upsell_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price decimal(12,2) not null default 0,
  category text not null default 'extras',
  icon_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Add icon_url to service_upsells for add-on icons
alter table public.service_upsells
  add column if not exists icon_url text;

-- 4. Seed stock service templates (add your images to public/images/stock/)
do $$
begin
  if not exists (select 1 from public.service_templates limit 1) then
    insert into public.service_templates (name, duration_mins, base_price, description, image_url, sort_order)
    values
      ('Interior Detail', 120, 150, 'Deep clean interior: vacuum, wipe surfaces, windows, upholstery.', '/images/stock/interior-detail.svg', 1),
      ('Exterior Wash', 45, 35, 'Hand wash, wheels, tires, windows.', '/images/stock/exterior-wash.svg', 2),
      ('Inside and Out Detail', 180, 200, 'Full interior and exterior detail package.', '/images/stock/inside-out-detail.svg', 3),
      ('Ceramic Coating', 480, 800, 'Paint protection with ceramic coating application.', '/images/stock/ceramic-coating.svg', 4);
  end if;
end $$;

-- 5. Seed stock upsell templates (add your icons to public/images/icons/)
do $$
begin
  if not exists (select 1 from public.upsell_templates limit 1) then
    insert into public.upsell_templates (name, price, category, icon_url, sort_order)
    values
      ('Pet Hair Removal', 35, 'extras', '/images/icons/pet-hair.svg', 1),
      ('Sand Removal', 25, 'extras', '/images/icons/sand.svg', 2),
      ('Carpet Shampoo', 45, 'extras', '/images/icons/carpet-shampoo.svg', 3),
      ('Leather Conditioning', 40, 'extras', '/images/icons/leather-conditioning.svg', 4);
  end if;
end $$;

-- 6. Copy templates into new org on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  business_name_text text;
  base_slug text;
  final_slug text;
  t record;
  new_svc_id uuid;
begin
  business_name_text := coalesce(trim(new.raw_user_meta_data->>'business_name'), '');

  base_slug := regexp_replace(regexp_replace(lower(business_name_text), '\s+', '-', 'g'), '[^a-z0-9-]+', '', 'g');
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'org';
  end if;

  final_slug := base_slug;
  while exists (select 1 from public.organizations where booking_slug = final_slug) loop
    final_slug := base_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end loop;

  insert into public.organizations (id, name, booking_slug, updated_at)
  values (gen_random_uuid(), nullif(trim(business_name_text), ''), final_slug, now())
  returning id into new_org_id;

  insert into public.profiles (id, role, display_name, business_name, org_id)
  values (
    new.id,
    'owner',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    nullif(trim(business_name_text), ''),
    new_org_id
  );

  -- Copy stock service templates into org services + default size prices
  for t in select * from public.service_templates order by sort_order
  loop
    insert into public.services (org_id, name, duration_mins, base_price, description, photo_urls)
    values (
      new_org_id,
      t.name,
      t.duration_mins,
      t.base_price,
      t.description,
      case when t.image_url is not null and t.image_url <> '' then jsonb_build_array(t.image_url) else '[]'::jsonb end
    )
    returning id into new_svc_id;
    insert into public.service_size_prices (service_id, size_key, label, price_offset)
    values
      (new_svc_id, 'sedan', 'Sedan', 0),
      (new_svc_id, 'suv_5', 'SUV 5-seat', 20),
      (new_svc_id, 'suv_7', 'SUV 7-seat', 30),
      (new_svc_id, 'truck', 'Truck', 40);
  end loop;

  -- Copy stock upsell templates into org add-ons
  insert into public.service_upsells (org_id, name, price, category, icon_url, sort_order)
  select new_org_id, name, price, category, icon_url, sort_order
  from public.upsell_templates
  order by sort_order;

  return new;
end;
$$ language plpgsql security definer;

-- 7. RLS: allow authenticated users to read templates (for "Add from template" in CRM)
alter table public.service_templates enable row level security;
alter table public.upsell_templates enable row level security;
drop policy if exists "Authenticated can read service_templates" on public.service_templates;
create policy "Authenticated can read service_templates"
  on public.service_templates for select to authenticated using (true);
drop policy if exists "Authenticated can read upsell_templates" on public.upsell_templates;
create policy "Authenticated can read upsell_templates"
  on public.upsell_templates for select to authenticated using (true);

comment on function public.handle_new_user is 'On signup: create org, profile, copy stock services and add-ons for the org.';
comment on table public.service_templates is 'Stock services copied to new orgs; orgs can also add from template in CRM.';
comment on table public.upsell_templates is 'Stock add-ons copied to new orgs; orgs can add from template in CRM.';
