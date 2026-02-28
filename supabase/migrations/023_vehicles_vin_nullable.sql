-- Allow NULL for vin so the Add vehicle form can leave VIN blank
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicles' and column_name = 'vin'
    and is_nullable = 'NO'
  ) then
    alter table public.vehicles alter column vin drop not null;
  end if;
end $$;
