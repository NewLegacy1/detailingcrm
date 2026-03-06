-- Seed a default detailer checklist for every org that has no default checklist yet.
-- Orgs can change these in Settings → Checklist (edit, remove, add).

insert into public.organization_default_checklist (org_id, label, sort_order)
select o.id, v.label, v.ord
from public.organizations o
cross join (
  values
    ('Inspect vehicle on arrival', 0),
    ('Confirm service and add-ons with customer', 1),
    ('Exterior wash and prep', 2),
    ('Interior vacuum and clean', 3),
    ('Apply protection/coating if applicable', 4),
    ('Final inspection and walkthrough', 5),
    ('Collect payment', 6),
    ('Customer sign-off', 7)
) as v(label, ord)
where not exists (
  select 1 from public.organization_default_checklist c where c.org_id = o.id
);

-- When a new organization is created, give it the same default checklist.
create or replace function public.seed_default_checklist_for_new_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_default_checklist (org_id, label, sort_order)
  values
    (new.id, 'Inspect vehicle on arrival', 0),
    (new.id, 'Confirm service and add-ons with customer', 1),
    (new.id, 'Exterior wash and prep', 2),
    (new.id, 'Interior vacuum and clean', 3),
    (new.id, 'Apply protection/coating if applicable', 4),
    (new.id, 'Final inspection and walkthrough', 5),
    (new.id, 'Collect payment', 6),
    (new.id, 'Customer sign-off', 7);
  return new;
end;
$$;

drop trigger if exists seed_default_checklist_on_org_insert on public.organizations;
create trigger seed_default_checklist_on_org_insert
  after insert on public.organizations
  for each row
  execute function public.seed_default_checklist_for_new_org();
