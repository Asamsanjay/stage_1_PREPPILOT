# PrepPilot: Audit & Architecture Overhaul Log (FIXES_APPLIED)

This document presents a detailed audit, root cause analysis, architecture refactoring report, and build verification log for **PrepPilot**.

---

## 1. Root Cause Analysis: Why Email/Password Failed while Google OAuth Worked

1. **Missing Unified Profile System**:
   - Google OAuth users and Email/Password users were not synchronized with a single Supabase database profile table (`profiles`).
   - Profile rows were not being queried or inserted during registration/login.

2. **Email Verification State Handling**:
   - In Supabase, if email confirmation is enabled on your Supabase project dashboard, `signUp()` returns a user with `data.session = null` until confirmed via email link. Attempting to `signInWithPassword()` on an unconfirmed email returns `"Email not confirmed"`.
   - The app was failing to communicate email verification requirements to the user.

3. **Session Lifecycle & Profile Sync Solution**:
   - Implemented a unified `ensureUserProfile(user)` helper in `src/utils/profileService.js`.
   - Connected `ensureUserProfile(user)` into `App.jsx` (`onAuthStateChange` and `getSession()`), as well as `AuthPage.jsx` (`signInWithPassword` and `signUp`).
   - Unified Google OAuth users and Email/Password users under the same `profiles` schema (`id = auth.users.id`).

---

## 2. Summary of Fixes Applied

| Component / Subsystem | Root Cause | Fix Applied | Status |
| :--- | :--- | :--- | :--- |
| **Profile Synchronization** | No connection to Supabase `profiles` table. | Created `ensureUserProfile(user)` in `src/utils/profileService.js`. Automatically checks/creates profile (`id`, `name`, `email`, `avatar_url`). | **Fixed** |
| **Email/Password Registration** | Registration didn't handle unconfirmed emails or existing users. | Updated `handleRegisterSubmit` to call `supabase.auth.signUp()`, handle duplicate user errors (`"You are already registered, please login."`), and instruct users when email confirmation is needed. | **Fixed** |
| **Email/Password Login** | Vague error handling for unverified emails and bad credentials. | Updated `handleLoginSubmit` to call `supabase.auth.signInWithPassword()`, distinguish unconfirmed email errors, and load `ensureUserProfile(user)`. | **Fixed** |
| **Google OAuth Integration** | Google users were not linked to the same profile system. | `ensureUserProfile(user)` extracts Google metadata (`full_name`, `avatar_url`/`picture`) and saves to the same `profiles` table. | **Fixed** |
| **Session Persistence** | Refreshing the page reset user state. | `App.jsx` uses `getSession()` and `onAuthStateChange()` to restore session and profile data on refresh. | **Fixed** |
| **Real Password Reset** | Hard-coded `alert()` dialog. | Connected `supabase.auth.resetPasswordForEmail()` with a real reset modal. | **Fixed** |
| **Security & Passwords** | Local storage password retention concerns. | 100% of password storage removed. Supabase Auth is the single source of truth. Frontend uses only public `anon` key. | **Fixed** |

---

## 3. Security Audit & Key Safety
- **No Password Persistence**: No passwords stored in `localStorage`, `sessionStorage`, or custom database tables.
- **Environment Keys**: Frontend uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. No `SUPABASE_SERVICE_ROLE_KEY` is exposed in client code.

---

## 4. Final Build Verification
- **Commands Executed**:
  1. `npm install` $\rightarrow$ Exit Code `0`.
  2. `npm run build` $\rightarrow$ Built in **676ms** with **0 errors**, 0 missing modules, 0 JSX syntax errors.
