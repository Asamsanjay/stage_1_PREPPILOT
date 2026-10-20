# PrepPilot: Supabase Setup Guide & Database Configuration

This document provides instructions for configuring your Supabase project for **PrepPilot**.

---

## 1. Environment Variables

Create a `.env` file in the project root (see [.env.example](file:///c:/Users/samsanjay/prepplt/.env.example)):

```env
VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

> [!WARNING]
> Only use the **anon (public)** API key in frontend environment variables. Never expose the `service_role` key in frontend code.

---

## 2. Supabase Authentication Settings

1. Navigate to **Authentication** $\rightarrow$ **Providers** in your Supabase Dashboard.
2. Enable **Email** provider.
3. (Optional) Enable **OAuth Providers** (Google, GitHub, Facebook, LinkedIn):
   - Configure Client IDs and Secrets in Supabase Dashboard.
   - Add your site URL (e.g. `http://localhost:5173`) to **Redirect URLs**.

---

## 3. Recommended Database Table: `profiles`

To store user profile metadata safely without storing passwords:

```sql
-- Create a public profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  email text,
  avatar_url text
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create a profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 4. Row Level Security (RLS) Guidelines
- Always enable RLS on custom user tables.
- Use `auth.uid() = user_id` in RLS policies to restrict data access to authenticated owners.
