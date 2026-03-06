-- Team invites: org invites by email with role; invitee signs up or signs in and is linked to org
create table if not exists public.team_invites (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'technician')),
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists team_invites_token_idx on public.team_invites(token);
create index if not exists team_invites_org_id_idx on public.team_invites(org_id);

alter table public.team_invites enable row level security;

-- Only org members with team access can manage invites (service role used in API for create/accept)
drop policy if exists "Org members can view team invites" on public.team_invites;
create policy "Org members can view team invites"
  on public.team_invites for select
  using (
    org_id in (select org_id from public.profiles where id = auth.uid() and org_id is not null)
  );

drop policy if exists "Org owners and admins can insert team invites" on public.team_invites;
create policy "Org owners and admins can insert team invites"
  on public.team_invites for insert
  with check (
    org_id in (
      select org_id from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

comment on table public.team_invites is 'Pending team invites; invitee uses token to join org with assigned role';
