# Customer groups setup

If **New group** on the Customers page fails or shows an error, run the SQL below in **Supabase Dashboard → SQL Editor** (paste and Run).

```sql
-- Customer groups: org-scoped groups to sort/filter customers

create table if not exists public.customer_groups (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_groups_org_id on public.customer_groups(org_id);
alter table public.customer_groups enable row level security;

drop policy if exists "Users can manage customer_groups in same org" on public.customer_groups;
create policy "Users can manage customer_groups in same org" on public.customer_groups for all
  using (org_id = public.get_user_org_id())
  with check (org_id = public.get_user_org_id());

create table if not exists public.customer_group_members (
  client_id uuid not null references public.clients(id) on delete cascade,
  group_id uuid not null references public.customer_groups(id) on delete cascade,
  primary key (client_id, group_id)
);

create index if not exists idx_customer_group_members_group_id on public.customer_group_members(group_id);
alter table public.customer_group_members enable row level security;

drop policy if exists "Users can manage customer_group_members for clients in same org" on public.customer_group_members;
create policy "Users can manage customer_group_members for clients in same org" on public.customer_group_members for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = customer_group_members.client_id and c.org_id = public.get_user_org_id()
    )
    and exists (
      select 1 from public.customer_groups g
      where g.id = customer_group_members.group_id and g.org_id = public.get_user_org_id()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = customer_group_members.client_id and c.org_id = public.get_user_org_id()
    )
    and exists (
      select 1 from public.customer_groups g
      where g.id = customer_group_members.group_id and g.org_id = public.get_user_org_id()
    )
  );
```

**Important:** In the SQL Editor, paste and run only the SQL inside the code block above (from `create table` through the final `);`). Do not paste this whole Markdown file.
