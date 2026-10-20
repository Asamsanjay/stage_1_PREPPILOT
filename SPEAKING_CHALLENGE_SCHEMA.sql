-- ==============================================================================
-- PrepPilot: Speaking Challenge Database & Storage Schema for Supabase
-- ==============================================================================
-- Execute this script in your Supabase SQL Editor to enable:
-- 1. Speaking Challenge metadata table with Row Level Security (RLS)
-- 2. Private Supabase Storage bucket ('speaking-recordings') with signed URL access

-- 1. Create speaking_challenges table
create table if not exists public.speaking_challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  local_recording_id text not null,
  recording_path text null,
  topic text not null,
  difficulty text not null,
  duration_seconds integer not null,
  spent_seconds integer not null,
  prep_type text default 'now' not null,
  completed_at timestamp with time zone default now() not null,
  score integer null,
  status text default 'completed' not null
);

-- Ensure recording_path column exists if table was already created
alter table public.speaking_challenges add column if not exists recording_path text null;

-- 2. Enable Row Level Security (RLS) on speaking_challenges
alter table public.speaking_challenges enable row level security;

-- 3. RLS Policies for speaking_challenges table
create policy "Users can view their own speaking challenges" on public.speaking_challenges
  for select using (auth.uid() = user_id);

create policy "Users can insert their own speaking challenges" on public.speaking_challenges
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own speaking challenges" on public.speaking_challenges
  for update using (auth.uid() = user_id);

create policy "Users can delete their own speaking challenges" on public.speaking_challenges
  for delete using (auth.uid() = user_id);

-- 4. Indexes for fast retrieval
create index if not exists speaking_challenges_user_id_idx on public.speaking_challenges (user_id);
create index if not exists speaking_challenges_rec_id_idx on public.speaking_challenges (local_recording_id);

-- ==============================================================================
-- Supabase Storage: Private 'speaking-recordings' Bucket & RLS
-- ==============================================================================

-- 5. Create private storage bucket for user recordings
insert into storage.buckets (id, name, public)
values ('speaking-recordings', 'speaking-recordings', false)
on conflict (id) do nothing;

-- 6. Storage Object Policies (User folder isolation: user_id/recording_id.webm)

-- Allow authenticated users to upload recordings into their own user folder
create policy "Users can upload their own recordings" on storage.objects
  for insert with check (
    bucket_id = 'speaking-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to view/stream their own recordings
create policy "Users can view their own recordings" on storage.objects
  for select using (
    bucket_id = 'speaking-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own recordings
create policy "Users can update their own recordings" on storage.objects
  for update using (
    bucket_id = 'speaking-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own recordings
create policy "Users can delete their own recordings" on storage.objects
  for delete using (
    bucket_id = 'speaking-recordings'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
