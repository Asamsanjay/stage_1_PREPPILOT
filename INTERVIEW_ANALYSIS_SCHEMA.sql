-- ==============================================================================
-- PrepPilot: AI Interviewer Agent Database Schema & Migration for Supabase
-- ==============================================================================
-- Adds AI evaluation report, questions & answers transcript, and job role
-- to public.mock_interviews table with strict Row Level Security (RLS).

-- 1. Ensure columns exist on public.mock_interviews
alter table public.mock_interviews 
  add column if not exists job_role text null,
  add column if not exists questions_and_answers jsonb null,
  add column if not exists ai_report jsonb null;

-- 2. Indexes for performance and JSON querying
create index if not exists mock_interviews_completed_at_idx 
  on public.mock_interviews (completed_at desc);

-- 3. Verify Row Level Security is active
alter table public.mock_interviews enable row level security;

-- 4. Re-affirm RLS policies (only authenticated owners can read or write their records)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'mock_interviews' and policyname = 'Users can view their own mock interviews'
  ) then
    create policy "Users can view their own mock interviews" on public.mock_interviews
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'mock_interviews' and policyname = 'Users can insert their own mock interviews'
  ) then
    create policy "Users can insert their own mock interviews" on public.mock_interviews
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'mock_interviews' and policyname = 'Users can update their own mock interviews'
  ) then
    create policy "Users can update their own mock interviews" on public.mock_interviews
      for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'mock_interviews' and policyname = 'Users can delete their own mock interviews'
  ) then
    create policy "Users can delete their own mock interviews" on public.mock_interviews
      for delete using (auth.uid() = user_id);
  end if;
end $$;
