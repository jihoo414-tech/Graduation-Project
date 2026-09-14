create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'patient' check (role in ('patient', 'doctor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing installations as well as new databases.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('patient', 'doctor', 'admin'));

-- Role changes are performed only through trusted database administration.
revoke update on public.profiles from anon, authenticated;

alter table public.profiles enable row level security;

-- Every Auth account receives a patient profile by default. Trusted administrators
-- can promote an existing profile to doctor/admin through the SQL editor.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'patient')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

insert into public.profiles (id, role)
select id, 'patient'
from auth.users
on conflict (id) do nothing;

create or replace function public.is_clinical_staff(user_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role in ('doctor', 'admin')
  );
$$;

revoke all on function public.is_clinical_staff(uuid) from public;
grant execute on function public.is_clinical_staff(uuid) to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Clinical staff can read patient profiles" on public.profiles;
create policy "Clinical staff can read patient profiles"
  on public.profiles
  for select
  using (public.is_clinical_staff(auth.uid()));

drop policy if exists "Users can insert their own patient profile" on public.profiles;
create policy "Users can insert their own patient profile"
  on public.profiles
  for insert
  with check (auth.uid() = id and role = 'patient');

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id text not null,
  risk_group text check (risk_group in ('High', 'Low') or risk_group is null),
  risk_score double precision,
  risk_threshold double precision,
  age integer,
  gender text,
  stage text,
  variant_count integer not null default 0,
  stromal_score double precision,
  immune_score double precision,
  adapter text not null,
  result_version text not null,
  normalized_input jsonb not null,
  result_payload jsonb not null,
  survival_curve jsonb,
  created_at timestamptz not null default now()
);

alter table public.analysis_results
  add column if not exists patient_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete restrict;

-- Existing records were created by, and belonged to, the same account.
update public.analysis_results
set patient_user_id = user_id
where patient_user_id is null;

update public.analysis_results
set created_by = user_id
where created_by is null;

alter table public.analysis_results
  alter column patient_user_id set not null,
  alter column created_by set not null;

alter table public.analysis_results enable row level security;

drop policy if exists "Users can read their own analysis results" on public.analysis_results;
drop policy if exists "Users can read assigned analysis results" on public.analysis_results;
create policy "Users can read assigned analysis results"
  on public.analysis_results
  for select
  using (
    auth.uid() = patient_user_id
    or public.is_clinical_staff(auth.uid())
  );

drop policy if exists "Users can insert their own analysis results" on public.analysis_results;
drop policy if exists "Clinical staff can insert analysis results" on public.analysis_results;
create policy "Clinical staff can insert analysis results"
  on public.analysis_results
  for insert
  with check (
    auth.uid() = created_by
    and public.is_clinical_staff(auth.uid())
  );

create index if not exists analysis_results_user_created_idx
  on public.analysis_results (user_id, created_at desc);

create index if not exists analysis_results_patient_user_created_idx
  on public.analysis_results (patient_user_id, created_at desc);

create index if not exists analysis_results_creator_created_idx
  on public.analysis_results (created_by, created_at desc);

create index if not exists analysis_results_patient_idx
  on public.analysis_results (patient_id);
