-- Allow 'manager' role in profiles (for RBAC)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('pending', 'owner', 'admin', 'manager', 'technician'));
