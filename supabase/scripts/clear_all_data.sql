-- One-time script: clear all application data so you can sign up fresh.
-- Run this in Supabase Dashboard → SQL Editor, then delete auth users (see below).

-- Order matters: delete rows that reference other tables first.

delete from public.job_photos;
delete from public.job_checklist_items;
delete from public.job_payments;
delete from public.reviews;
delete from public.communications;
delete from public.invoices;
delete from public.jobs;
delete from public.customer_group_members;
delete from public.customer_groups;
delete from public.vehicles;
delete from public.clients;
delete from public.service_size_prices;
delete from public.service_upsells;
delete from public.services;
delete from public.organization_default_checklist;
delete from public.profiles;
delete from public.organizations;

-- Next: delete Auth users so you can sign up again.
-- Option A: In Supabase Dashboard go to Authentication → Users → delete each user.
-- Option B: Uncomment the line below to delete all auth users from SQL (may require project owner):
-- delete from auth.users;
