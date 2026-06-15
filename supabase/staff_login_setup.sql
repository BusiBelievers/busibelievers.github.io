-- BUSI staff login setup for Supabase Auth.
-- Run this in the Supabase SQL Editor after creating staff accounts in
-- Authentication > Users.

create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where lower(email) = lower(auth.jwt() ->> 'email') limit 1;
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

create or replace function public.current_staff_profile()
returns table(full_name text, email text, role text)
language sql
security definer
set search_path = public
stable
as $$
  select u.full_name, u.email, u.role
  from public.users u
  where lower(u.email) = lower(auth.jwt() ->> 'email')
  limit 1;
$$;

revoke all on function public.current_staff_profile() from public;
grant execute on function public.current_staff_profile() to authenticated;

-- Add or update approved staff emails here after the matching Supabase Auth
-- user account exists. Roles allowed by the site are:
-- founder, coordinator, volunteer, viewer
--
-- Founder Control Center allows founder only.
-- Operational tools allow founder and coordinator.
--
-- Replace the sample values before running. The email must already exist in
-- Authentication > Users.
insert into public.users (auth_user_id, full_name, email, role)
select id, 'BUSI Founder Name', email, 'founder'
from auth.users
where lower(email) = lower('founder@example.com')
on conflict (email) do update
set auth_user_id = excluded.auth_user_id,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();
