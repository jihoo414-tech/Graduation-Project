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

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

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

alter table public.analysis_results enable row level security;

drop policy if exists "Users can read their own analysis results" on public.analysis_results;
create policy "Users can read their own analysis results"
  on public.analysis_results
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('doctor', 'admin')
    )
  );

drop policy if exists "Users can insert their own analysis results" on public.analysis_results;
create policy "Users can insert their own analysis results"
  on public.analysis_results
  for insert
  with check (auth.uid() = user_id);

create index if not exists analysis_results_user_created_idx
  on public.analysis_results (user_id, created_at desc);

create index if not exists analysis_results_patient_idx
  on public.analysis_results (patient_id);
