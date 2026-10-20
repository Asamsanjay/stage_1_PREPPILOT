-- ==============================================================================
-- PrepPilot: Mock Interview Database & Storage Schema for Supabase
-- ==============================================================================
-- Execute this script in your Supabase SQL Editor to enable:
-- 1. Mock Interview metadata table with Row Level Security (RLS)
-- 2. Private Supabase Storage bucket ('interview-recordings') with signed URL access

-- 1. Create mock_interviews table
create table if not exists public.mock_interviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  local_recording_id text null,
  recording_path text null,
  interview_type text not null,
  experience_level text not null,
  difficulty text not null,
  duration text not null,
  completed_at timestamp with time zone default now() not null,
  score integer null,
  status text default 'completed' not null
);

-- Ensure recording columns exist if table was already created
alter table public.mock_interviews add column if not exists local_recording_id text null;
alter table public.mock_interviews add column if not exists recording_path text null;

-- 2. Enable Row Level Security (RLS) on mock_interviews
alter table public.mock_interviews enable row level security;

-- 3. RLS Policies for mock_interviews table
create policy "Users can view their own mock interviews" on public.mock_interviews
  for select using (auth.uid() = user_id);

create policy "Users can insert their own mock interviews" on public.mock_interviews
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own mock interviews" on public.mock_interviews
  for update using (auth.uid() = user_id);

create policy "Users can delete their own mock interviews" on public.mock_interviews
  for delete using (auth.uid() = user_id);

-- 4. Indexes for fast retrieval
create index if not exists mock_interviews_user_id_idx on public.mock_interviews (user_id);
create index if not exists mock_interviews_rec_id_idx on public.mock_interviews (local_recording_id);

-- ==============================================================================
-- Supabase Storage: Private 'interview-recordings' Bucket & RLS
-- ==============================================================================

-- 5. Create private storage bucket for mock interview recordings
insert into storage.buckets (id, name, public)
values ('interview-recordings', 'interview-recordings', false)
on conflict (id) do nothing;

-- 6. Storage Object Policies (User folder isolation: user_id/recording_id.webm)

-- Allow authenticated users to upload interview recordings into their own user folder
create policy "Users can upload their own interview recordings" on storage.objects
  for insert with check (
    bucket_id = 'interview-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to view/stream their own interview recordings
create policy "Users can view their own interview recordings" on storage.objects
  for select using (
    bucket_id = 'interview-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own interview recordings
create policy "Users can update their own interview recordings" on storage.objects
  for update using (
    bucket_id = 'interview-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own interview recordings
create policy "Users can delete their own interview recordings" on storage.objects
  for delete using (
    bucket_id = 'interview-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
