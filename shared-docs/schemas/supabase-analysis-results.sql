begin;

set local lock_timeout = '10s';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'patient' check (role in ('patient', 'doctor', 'admin')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing installations as well as new databases.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists deleted_at timestamptz;
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
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'patient'
  )
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
      and deleted_at is null
  );
$$;

revoke all on function public.is_clinical_staff(uuid) from public;
grant execute on function public.is_clinical_staff(uuid) to authenticated;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
      and deleted_at is null
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Clinical staff can read patient profiles" on public.profiles;
create policy "Clinical staff can read patient profiles"
  on public.profiles
  for select
  using (role = 'patient' and public.is_clinical_staff(auth.uid()));

drop policy if exists "Administrators can read all profiles" on public.profiles;
create policy "Administrators can read all profiles"
  on public.profiles
  for select
  using (public.is_admin(auth.uid()));

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
  add column if not exists created_by uuid references auth.users(id) on delete restrict,
  add column if not exists deleted_at timestamptz;

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
    deleted_at is null
    and (
      auth.uid() = patient_user_id
      or public.is_clinical_staff(auth.uid())
    )
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

create or replace function public.soft_delete_analysis_result(target_result_id uuid)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_clinical_staff(auth.uid()) then
    raise insufficient_privilege using message = 'clinical role required';
  end if;

  update public.analysis_results
  set deleted_at = now()
  where id = target_result_id
    and deleted_at is null;

  return found;
end;
$$;

revoke all on function public.soft_delete_analysis_result(uuid) from public;
grant execute on function public.soft_delete_analysis_result(uuid) to authenticated;

create or replace function public.soft_delete_patient(target_patient_id uuid)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_clinical_staff(auth.uid()) then
    raise insufficient_privilege using message = 'clinical role required';
  end if;

  update public.profiles
  set deleted_at = now(), updated_at = now()
  where id = target_patient_id
    and role = 'patient'
    and deleted_at is null;

  if not found then
    return false;
  end if;

  update public.analysis_results
  set deleted_at = now()
  where patient_user_id = target_patient_id
    and deleted_at is null;

  return true;
end;
$$;

revoke all on function public.soft_delete_patient(uuid) from public;
grant execute on function public.soft_delete_patient(uuid) to authenticated;

create or replace function public.set_profile_role(target_user_id uuid, new_role text)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise insufficient_privilege using message = 'admin role required';
  end if;

  if target_user_id = auth.uid() then
    raise check_violation using message = 'cannot change own role';
  end if;

  if new_role not in ('patient', 'doctor', 'admin') then
    raise check_violation using message = 'invalid role';
  end if;

  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_user_id
    and deleted_at is null;

  return found;
end;
$$;

revoke all on function public.set_profile_role(uuid, text) from public;
grant execute on function public.set_profile_role(uuid, text) to authenticated;

create index if not exists analysis_results_user_created_idx
  on public.analysis_results (user_id, created_at desc);

create index if not exists analysis_results_patient_user_created_idx
  on public.analysis_results (patient_user_id, created_at desc);

create index if not exists analysis_results_creator_created_idx
  on public.analysis_results (created_by, created_at desc);

create index if not exists analysis_results_patient_idx
  on public.analysis_results (patient_id);

notify pgrst, 'reload schema';

commit;
