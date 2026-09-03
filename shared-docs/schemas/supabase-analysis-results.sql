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

create policy "Users can read their own analysis results"
  on public.analysis_results
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analysis results"
  on public.analysis_results
  for insert
  with check (auth.uid() = user_id);

create index if not exists analysis_results_user_created_idx
  on public.analysis_results (user_id, created_at desc);

create index if not exists analysis_results_patient_idx
  on public.analysis_results (patient_id);
