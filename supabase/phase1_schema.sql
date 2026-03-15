-- BUSI Phase 1 shared database schema for Supabase
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text unique not null,
  role text not null check (role in ('founder', 'coordinator', 'volunteer', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text unique not null,
  person_name text,
  contact_email text,
  contact_phone text,
  city text not null,
  need_type text not null,
  request_notes text,
  status text not null default 'Pending' check (status in ('Pending', 'Active', 'Completed', 'On Hold')),
  volunteers_needed integer not null default 0,
  funding_goal numeric(12,2) not null default 0,
  funding_raised numeric(12,2) not null default 0,
  agreement_accepted boolean not null default false,
  agreement_accepted_at timestamptz,
  priority text default 'Normal' check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  assigned_to uuid references public.users(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cases add column if not exists contact_email text;
alter table public.cases add column if not exists contact_phone text;
alter table public.cases add column if not exists request_notes text;
alter table public.cases add column if not exists agreement_accepted boolean not null default false;
alter table public.cases add column if not exists agreement_accepted_at timestamptz;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  city text not null,
  budget_goal numeric(12,2) default 0,
  status text not null default 'Active' check (status in ('Active', 'Completed', 'Paused')),
  case_id uuid references public.cases(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  phone text,
  skills text,
  availability text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.donations_log (
  id uuid primary key default gen_random_uuid(),
  source text,
  amount numeric(12,2),
  donor_name text,
  donor_email text,
  case_id uuid references public.cases(id),
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists trg_cases_updated_at on public.cases;
create trigger trg_cases_updated_at
before update on public.cases
for each row execute function public.touch_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists trg_volunteers_updated_at on public.volunteers;
create trigger trg_volunteers_updated_at
before update on public.volunteers
for each row execute function public.touch_updated_at();

alter table public.users enable row level security;
alter table public.cases enable row level security;
alter table public.projects enable row level security;
alter table public.volunteers enable row level security;
alter table public.activity_log enable row level security;
alter table public.donations_log enable row level security;

-- Helper role checks based on auth email matching users.email
create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role from public.users where lower(email) = lower(auth.jwt() ->> 'email') limit 1;
$$;

-- Founder full access
drop policy if exists users_founder_all on public.users;
create policy users_founder_all on public.users
for all
using (public.current_role() = 'founder')
with check (public.current_role() = 'founder');

drop policy if exists cases_founder_all on public.cases;
create policy cases_founder_all on public.cases
for all
using (public.current_role() = 'founder')
with check (public.current_role() = 'founder');

drop policy if exists projects_founder_all on public.projects;
create policy projects_founder_all on public.projects
for all
using (public.current_role() = 'founder')
with check (public.current_role() = 'founder');

drop policy if exists volunteers_founder_all on public.volunteers;
create policy volunteers_founder_all on public.volunteers
for all
using (public.current_role() = 'founder')
with check (public.current_role() = 'founder');

drop policy if exists activity_founder_all on public.activity_log;
create policy activity_founder_all on public.activity_log
for all
using (public.current_role() = 'founder')
with check (public.current_role() = 'founder');

drop policy if exists donations_founder_all on public.donations_log;
create policy donations_founder_all on public.donations_log
for all
using (public.current_role() = 'founder')
with check (public.current_role() = 'founder');

-- Coordinator read and update for operations
drop policy if exists cases_coordinator_read on public.cases;
create policy cases_coordinator_read on public.cases
for select
using (public.current_role() in ('founder', 'coordinator'));

drop policy if exists cases_coordinator_write on public.cases;
create policy cases_coordinator_write on public.cases
for update
using (public.current_role() in ('founder', 'coordinator'))
with check (public.current_role() in ('founder', 'coordinator'));

drop policy if exists projects_coordinator_read on public.projects;
create policy projects_coordinator_read on public.projects
for select
using (public.current_role() in ('founder', 'coordinator'));

drop policy if exists projects_coordinator_write on public.projects;
create policy projects_coordinator_write on public.projects
for update
using (public.current_role() in ('founder', 'coordinator'))
with check (public.current_role() in ('founder', 'coordinator'));

-- Volunteers and viewers can read published operational data
drop policy if exists cases_read_basic on public.cases;
create policy cases_read_basic on public.cases
for select
using (public.current_role() in ('founder', 'coordinator', 'volunteer', 'viewer'));

drop policy if exists projects_read_basic on public.projects;
create policy projects_read_basic on public.projects
for select
using (public.current_role() in ('founder', 'coordinator', 'volunteer', 'viewer'));

drop policy if exists volunteers_read_basic on public.volunteers;
create policy volunteers_read_basic on public.volunteers
for select
using (public.current_role() in ('founder', 'coordinator'));

-- Seed example rows (optional)
insert into public.cases (case_number, city, need_type, status)
values
('BUSI-006', 'San Antonio', 'Tree Removal', 'Completed'),
('BUSI-007', 'San Antonio', 'Lawn Care', 'Active'),
('BUSI-008', 'San Antonio', 'Vehicle Assistance', 'Pending')
on conflict (case_number) do nothing;
