-- Allow manager to read invoices (same org). Write stays owner/admin only.
drop policy if exists "Invoices owner admin" on public.invoices;

create policy "Invoices select owner admin manager" on public.invoices for select
  using (
    public.get_user_role() in ('owner', 'admin', 'manager')
    and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.org_id = public.get_user_org_id()
    )
  );

create policy "Invoices insert update delete owner admin" on public.invoices for all
  using (
    public.get_user_role() in ('owner', 'admin')
    and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.org_id = public.get_user_org_id()
    )
  )
  with check (
    public.get_user_role() in ('owner', 'admin')
    and exists (
      select 1 from public.clients c
      where c.id = invoices.client_id and c.org_id = public.get_user_org_id()
    )
  );

comment on policy "Invoices select owner admin manager" on public.invoices is 'Manager can view invoices; owner/admin can create/update/delete.';
