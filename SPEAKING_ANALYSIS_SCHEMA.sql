-- ==============================================================================
-- PrepPilot: Speaking Coach AI Analysis Reports Schema for Supabase
-- ==============================================================================
-- Execute this script in your Supabase SQL Editor to enable:
-- 1. Speaking Coach AI Analysis Reports table with Row Level Security (RLS)
-- 2. Performance indexes and foreign key linkages to auth.users and speaking_challenges

-- 1. Create speaking_analysis_reports table
create table if not exists public.speaking_analysis_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  challenge_id uuid references public.speaking_challenges(id) on delete set null null,
  local_recording_id text not null,
  overall_score integer null,
  category_scores jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  areas_to_improve jsonb not null default '[]'::jsonb,
  grammar_corrections jsonb not null default '[]'::jsonb,
  filler_words jsonb not null default '{}'::jsonb,
  personalized_suggestions jsonb not null default '[]'::jsonb,
  improved_sample_answer text null,
  delivery_notes text null,
  transcript text null,
  created_at timestamp with time zone default now() not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.speaking_analysis_reports enable row level security;

-- 3. RLS Policies: Restrict access strictly to authenticated report owners
drop policy if exists "Users can view their own speaking reports" on public.speaking_analysis_reports;
create policy "Users can view their own speaking reports" on public.speaking_analysis_reports
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own speaking reports" on public.speaking_analysis_reports;
create policy "Users can insert their own speaking reports" on public.speaking_analysis_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own speaking reports" on public.speaking_analysis_reports;
create policy "Users can update their own speaking reports" on public.speaking_analysis_reports
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own speaking reports" on public.speaking_analysis_reports;
create policy "Users can delete their own speaking reports" on public.speaking_analysis_reports
  for delete using (auth.uid() = user_id);

-- 4. Indexes for fast retrieval
create index if not exists speaking_analysis_user_id_idx on public.speaking_analysis_reports (user_id);
create index if not exists speaking_analysis_rec_id_idx on public.speaking_analysis_reports (local_recording_id);
create index if not exists speaking_analysis_challenge_id_idx on public.speaking_analysis_reports (challenge_id);
